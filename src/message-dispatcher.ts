/**
 * 消息分发模块
 * 负责将用户消息分发到 AI Agent 并处理回复
 */
import type { ResolvedWechatMpAccount } from "./types.js";
import { sendTypingStatus, sendCustomMessage, sendImageByUrl } from "./api.js";
import { isOk } from "./result.js";
import { processImagesInText } from "./image-processor.js";
import { WECHAT_MESSAGE_TEXT_LIMIT, MAX_IMAGES_PER_MESSAGE } from "./constants.js";

/**
 * 使用 runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher 分发消息并获取 AI 回复
 * 参考 LINE 插件的完整实现
 */
export async function dispatchWempMessage(params: {
  account: ResolvedWechatMpAccount;
  openId: string;
  text: string;
  messageId: string;
  timestamp: number;
  agentId: string;
  cfg: any;
  runtime: any;
  imageFilePath?: string;
}): Promise<void> {
  const { account, openId, text, messageId, timestamp, cfg, runtime, imageFilePath } = params;

  // 从 runtime 获取需要的函数
  const dispatchReplyWithBufferedBlockDispatcher = runtime.channel?.reply?.dispatchReplyWithBufferedBlockDispatcher;
  const finalizeInboundContext = runtime.channel?.reply?.finalizeInboundContext;
  const resolveAgentRoute = runtime.channel?.routing?.resolveAgentRoute;
  const formatInboundEnvelope = runtime.channel?.reply?.formatInboundEnvelope;
  const resolveEnvelopeFormatOptions = runtime.channel?.reply?.resolveEnvelopeFormatOptions;
  const recordChannelActivity = runtime.channel?.activity?.record;
  const chunkMarkdownText = runtime.channel?.text?.chunkMarkdownText;
  const recordSessionMetaFromInbound = runtime.channel?.session?.recordSessionMetaFromInbound;
  const resolveStorePath = runtime.channel?.session?.resolveStorePath;
  const updateLastRoute = runtime.channel?.session?.updateLastRoute;
  // 命令处理相关
  const isControlCommandMessage = runtime.channel?.commands?.isControlCommandMessage;
  const dispatchControlCommand = runtime.channel?.commands?.dispatchControlCommand;

  if (!dispatchReplyWithBufferedBlockDispatcher) {
    console.error(`[wemp:${account.accountId}] dispatchReplyWithBufferedBlockDispatcher not available in runtime`);
    return;
  }

  // 0. 检查是否是内置命令（/help, /clear, /new 等）
  if (isControlCommandMessage && dispatchControlCommand) {
    const isControlCmd = isControlCommandMessage(text, cfg);
    if (isControlCmd) {
      console.log(`[wemp:${account.accountId}] 检测到内置命令: ${text}`);
      try {
        const agentIdForCmd = params.agentId;
        const sessionKeyForCmd = `wemp:${agentIdForCmd}:${account.accountId}:${openId}`;
        const result = await dispatchControlCommand({
          command: text,
          cfg,
          channel: "wemp",
          accountId: account.accountId,
          sessionKey: sessionKeyForCmd,
          senderId: openId,
          agentId: agentIdForCmd,
          deliver: async (response: string) => {
            await sendCustomMessage(account, openId, response);
          },
        });
        if (result?.handled) {
          console.log(`[wemp:${account.accountId}] 内置命令已处理`);
          return;
        }
      } catch (err) {
        console.warn(`[wemp:${account.accountId}] 内置命令处理失败:`, err);
      }
    }
  }

  // 1. 记录渠道活动
  try {
    recordChannelActivity?.({
      channel: "wemp",
      accountId: account.accountId,
      direction: "inbound",
    });
  } catch (err) {
    console.warn(`[wemp:${account.accountId}] recordChannelActivity failed:`, err);
  }

  // 2. 解析路由 - 但保留我们基于配对状态的 agentId
  const agentId = params.agentId; // 保留传入的 agentId（基于配对状态）

  // 构建 sessionKey - 包含 agentId 以区分不同 agent 的会话
  let sessionKey = `wemp:${agentId}:${account.accountId}:${openId}`;
  let mainSessionKey = `wemp:${account.accountId}:${openId}`;

  // 尝试使用 resolveAgentRoute 获取更多路由信息，但不覆盖 agentId
  if (resolveAgentRoute) {
    try {
      const route = resolveAgentRoute({
        cfg,
        channel: "wemp",
        accountId: account.accountId,
        peer: {
          kind: "dm",
          id: openId,
        },
      });
      // 只使用 route 的 mainSessionKey 格式，但保留我们的 agentId
      if (route.mainSessionKey) {
        mainSessionKey = route.mainSessionKey;
      }
      // sessionKey 需要包含我们的 agentId
      sessionKey = `wemp:${agentId}:${account.accountId}:${openId}`;
    } catch (err) {
      console.warn(`[wemp:${account.accountId}] resolveAgentRoute failed:`, err);
    }
  }

  console.log(`[wemp:${account.accountId}] 路由: agentId=${agentId}, sessionKey=${sessionKey}`);

  // 3. 构建消息信封
  const fromAddress = `wemp:${openId}`;

  // 如果有图片，添加图片路径标记（参考 QQBot 的做法，避免 base64 数据过大）
  let messageText = text;
  if (imageFilePath) {
    messageText = `[图片: ${imageFilePath}]\n\n${text}`;
  }

  let body = messageText;

  if (formatInboundEnvelope) {
    try {
      const envelopeOptions = resolveEnvelopeFormatOptions?.(cfg);
      body = formatInboundEnvelope({
        channel: "WEMP",
        from: openId,
        timestamp,
        body: messageText,
        chatType: "direct",
        sender: { id: openId },
        envelope: envelopeOptions,
      }) ?? messageText;
    } catch (err) {
      console.warn(`[wemp:${account.accountId}] formatInboundEnvelope failed:`, err);
    }
  }

  // 4. 构建 inbound context
  let ctx: any = {
    Body: body,
    RawBody: messageText,
    CommandBody: text,
    From: fromAddress,
    To: fromAddress,
    SessionKey: sessionKey,
    AccountId: account.accountId,
    ChatType: "direct",
    ConversationLabel: openId,
    SenderId: openId,
    Provider: "wemp",
    Surface: "wemp",
    MessageSid: messageId,
    Timestamp: timestamp,
    OriginatingChannel: "wemp",
    OriginatingTo: fromAddress,
    // 指定 agent ID - 这是关键！
    AgentId: agentId,
  };

  // 添加图片附件（使用本地文件路径）
  if (imageFilePath) {
    ctx.Attachments = [
      {
        type: "image",
        url: imageFilePath,
        contentType: "image/jpeg",
      },
    ];
    ctx.MediaUrls = [imageFilePath];
    ctx.NumMedia = "1";
  }

  // 使用 finalizeInboundContext 处理 context
  if (finalizeInboundContext) {
    ctx = finalizeInboundContext(ctx);
  }

  // 5. 记录会话元数据
  if (recordSessionMetaFromInbound && resolveStorePath) {
    try {
      const storePath = resolveStorePath(cfg.session?.store, { agentId });
      await recordSessionMetaFromInbound({
        storePath,
        sessionKey: ctx.SessionKey ?? sessionKey,
        ctx,
      });
    } catch (err) {
      console.warn(`[wemp:${account.accountId}] recordSessionMetaFromInbound failed:`, err);
    }
  }

  // 6. 更新最后路由
  if (updateLastRoute && resolveStorePath) {
    try {
      const storePath = resolveStorePath(cfg.session?.store, { agentId });
      await updateLastRoute({
        storePath,
        sessionKey: mainSessionKey,
        deliveryContext: {
          channel: "wemp",
          to: openId,
          accountId: account.accountId,
        },
        ctx,
      });
    } catch (err) {
      console.warn(`[wemp:${account.accountId}] updateLastRoute failed:`, err);
    }
  }

  // 7. 分发消息并获取回复
  try {
    const { queuedFinal } = await dispatchReplyWithBufferedBlockDispatcher({
      ctx,
      cfg,
      dispatcherOptions: {
        deliver: async (payload: any) => {
          // 发送正在输入状态
          sendTypingStatus(account, openId).catch(() => {});

          // 处理文本回复
          let replyText = payload.text || payload.content || "";

          // 从文本中提取图片 URL
          const { text: processedText, imageUrls: extractedImageUrls } = processImagesInText(replyText);
          replyText = processedText;

          if (replyText) {
            // 使用 chunkMarkdownText 分块发送长文本
            let chunks: string[];
            if (chunkMarkdownText) {
              try {
                chunks = chunkMarkdownText(replyText, WECHAT_MESSAGE_TEXT_LIMIT);
              } catch {
                chunks = [replyText];
              }
            } else {
              // 简单分块
              chunks = [];
              let remaining = replyText;
              while (remaining.length > 0) {
                chunks.push(remaining.slice(0, WECHAT_MESSAGE_TEXT_LIMIT));
                remaining = remaining.slice(WECHAT_MESSAGE_TEXT_LIMIT);
              }
            }

            // 发送每个分块
            for (const chunk of chunks) {
              if (chunk.trim()) {
                await sendCustomMessage(account, openId, chunk);
              }
            }
          }

          // 合并 payload 中的媒体 URL 和从文本中提取的图片 URL
          const payloadMediaUrls = payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []);
          const allImageUrls = [...payloadMediaUrls, ...extractedImageUrls];

          // 发送图片（限制数量）
          for (const imageUrl of allImageUrls.slice(0, MAX_IMAGES_PER_MESSAGE)) {
            if (imageUrl) {
              try {
                const result = await sendImageByUrl(account, openId, imageUrl);
                if (!isOk(result)) {
                  console.warn(`[wemp:${account.accountId}] 发送图片失败: ${result.error}`);
                }
              } catch (err) {
                console.warn(`[wemp:${account.accountId}] 发送图片异常: ${err}`);
              }
            }
          }

          // 记录出站活动
          try {
            recordChannelActivity?.({
              channel: "wemp",
              accountId: account.accountId,
              direction: "outbound",
            });
          } catch {}
        },
        onError: (err: any, info: any) => {
          console.error(`[wemp:${account.accountId}] ${info?.kind || "reply"} 失败:`, err);
        },
      },
      replyOptions: {},
    });

    if (!queuedFinal) {
      console.log(`[wemp:${account.accountId}] 没有生成回复`);
    }
  } catch (err) {
    console.error(`[wemp:${account.accountId}] 消息分发失败:`, err);
    // 发送错误消息
    await sendCustomMessage(account, openId, "抱歉，处理消息时出现错误，请稍后再试。");
  }
}
