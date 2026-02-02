/**
 * 微信公众号扩展 API 模块
 * 统一导出所有 API 功能
 */

// 草稿管理
export {
  addDraft,
  updateDraft,
  getDraft,
  listDrafts,
  deleteDraft,
  getDraftCount,
  type DraftArticle,
  type DraftItem,
} from "./draft.js";

// 发布管理
export {
  publishDraft,
  getPublishStatus,
  listPublished,
  deletePublished,
  getPublishedArticle,
  PUBLISH_STATUS_TEXT,
  type PublishStatus,
  type PublishResult,
  type PublishStatusResult,
  type PublishedArticle,
  type PublishedItem,
} from "./publish.js";

// 内容处理
export {
  processArticleImages,
  extractImageUrls,
  validateArticleContent,
  markdownToHtml,
  generateDigest,
  type ContentValidation,
} from "./content.js";

// 数据统计
export {
  getUserSummary,
  getUserCumulate,
  getArticleSummary,
  getArticleTotal,
  getUserRead,
  getUserShare,
  getUpstreamMsg,
  getUpstreamMsgHour,
  formatDate,
  getYesterday,
  getDaysAgo,
  getLastWeekRange,
  type UserSummaryItem,
  type UserCumulateItem,
  type ArticleSummaryItem,
  type ArticleTotalItem,
  type ArticleTotalDetail,
  type UserReadItem,
  type UserShareItem,
  type UpstreamMsgItem,
  type UpstreamMsgHourItem,
} from "./stats.js";

// 标签管理
export {
  createTag,
  getTags,
  updateTag,
  deleteTag,
  batchTagUsers,
  batchUntagUsers,
  getUserTags,
  getTagUsers,
  type Tag,
} from "./tag.js";

// 用户管理
export {
  getUserInfo,
  batchGetUserInfo,
  getFollowers,
  setUserRemark,
  getBlacklist,
  batchBlacklistUsers,
  batchUnblacklistUsers,
  type UserInfo,
} from "./user.js";

// 模板消息
export {
  sendTemplateMessage,
  getTemplates,
  addTemplate,
  deleteTemplate,
  getIndustry,
  type TemplateData,
  type Template,
} from "./template.js";

// 评论管理
export {
  listComments,
  markCommentElect,
  unmarkCommentElect,
  deleteComment,
  replyComment,
  deleteCommentReply,
  openComment,
  closeComment,
  getAutoReplyRules,
  type Comment,
  type AutoReplyRule,
  type AutoReplyInfo,
} from "./comment.js";

// 二维码
export {
  createQRCode,
  getQRCodeImageUrl,
  createChannelQRCodes,
  type QRCodeType,
  type QRCodeResult,
} from "./qrcode.js";

// 群发消息
export {
  massSendByTag,
  massSendByOpenIds,
  previewMessage,
  deleteMassMessage,
  getMassMessageStatus,
  getMassSpeed,
  setMassSpeed,
  type MassContent,
  type MassResult,
  type MassMessageStatus,
} from "./mass.js";

// OCR 识别
export {
  ocrIdCard,
  ocrBizLicense,
  ocrBankCard,
  ocrDrivingLicense,
  ocrDriving,
  ocrCommon,
  ocrQRCode,
  type IdCardResult,
  type BizLicenseResult,
  type DrivingLicenseResult,
  type DrivingResult,
} from "./ocr.js";

// AI 能力
export {
  translate,
  aiCrop,
  superResolution,
} from "./ai.js";
