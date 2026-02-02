/**
 * 微信公众号 OCR 识别 API
 * 用于识别各类证件和文字
 */
import { getAccessToken, safeFetch } from "../api.js";
import { DEFAULT_FETCH_TIMEOUT_MS } from "../constants.js";
import type { ResolvedWechatMpAccount } from "../types.js";
import { type Result, ok, err } from "../result.js";

const API_BASE = "https://api.weixin.qq.com";

/**
 * 身份证识别结果
 */
export interface IdCardResult {
  type: "Front" | "Back";
  name?: string;
  id?: string;
  addr?: string;
  sex?: string;
  nation?: string;
  birth?: string;
  validDate?: string;
}

/**
 * 身份证识别
 */
export async function ocrIdCard(
  account: ResolvedWechatMpAccount,
  imageUrl: string,
  cardType?: "Front" | "Back"
): Promise<Result<IdCardResult>> {
  try {
    const accessToken = await getAccessToken(account);
    let url = `${API_BASE}/cv/ocr/idcard?access_token=${accessToken}&img_url=${encodeURIComponent(imageUrl)}`;
    if (cardType) {
      url += `&type=${cardType}`;
    }

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      type?: string;
      name?: string;
      id?: string;
      addr?: string;
      sex?: string;
      nation?: string;
      birth?: string;
      valid_date?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      type: (data.type || "Front") as "Front" | "Back",
      name: data.name,
      id: data.id,
      addr: data.addr,
      sex: data.sex,
      nation: data.nation,
      birth: data.birth,
      validDate: data.valid_date,
    });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 营业执照识别结果
 */
export interface BizLicenseResult {
  regNum?: string;
  serial?: string;
  legalRepresentative?: string;
  enterpriseName?: string;
  typeOfOrganization?: string;
  address?: string;
  typeOfEnterprise?: string;
  businessScope?: string;
  registeredCapital?: string;
  paidInCapital?: string;
  validPeriod?: string;
  registerDate?: string;
}

/**
 * 营业执照识别
 */
export async function ocrBizLicense(
  account: ResolvedWechatMpAccount,
  imageUrl: string
): Promise<Result<BizLicenseResult>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cv/ocr/bizlicense?access_token=${accessToken}&img_url=${encodeURIComponent(imageUrl)}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      reg_num?: string;
      serial?: string;
      legal_representative?: string;
      enterprise_name?: string;
      type_of_organization?: string;
      address?: string;
      type_of_enterprise?: string;
      business_scope?: string;
      registered_capital?: string;
      paid_in_capital?: string;
      valid_period?: string;
      register_date?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      regNum: data.reg_num,
      serial: data.serial,
      legalRepresentative: data.legal_representative,
      enterpriseName: data.enterprise_name,
      typeOfOrganization: data.type_of_organization,
      address: data.address,
      typeOfEnterprise: data.type_of_enterprise,
      businessScope: data.business_scope,
      registeredCapital: data.registered_capital,
      paidInCapital: data.paid_in_capital,
      validPeriod: data.valid_period,
      registerDate: data.register_date,
    });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 银行卡识别
 */
export async function ocrBankCard(
  account: ResolvedWechatMpAccount,
  imageUrl: string
): Promise<Result<{ number: string }>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cv/ocr/bankcard?access_token=${accessToken}&img_url=${encodeURIComponent(imageUrl)}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      number?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({ number: data.number || "" });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 驾驶证识别结果
 */
export interface DrivingLicenseResult {
  idNum?: string;
  name?: string;
  sex?: string;
  nationality?: string;
  address?: string;
  birthDate?: string;
  issueDate?: string;
  carClass?: string;
  validFrom?: string;
  validTo?: string;
  officialSeal?: string;
}

/**
 * 驾驶证识别
 */
export async function ocrDrivingLicense(
  account: ResolvedWechatMpAccount,
  imageUrl: string
): Promise<Result<DrivingLicenseResult>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cv/ocr/drivinglicense?access_token=${accessToken}&img_url=${encodeURIComponent(imageUrl)}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      id_num?: string;
      name?: string;
      sex?: string;
      nationality?: string;
      address?: string;
      birth_date?: string;
      issue_date?: string;
      car_class?: string;
      valid_from?: string;
      valid_to?: string;
      official_seal?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      idNum: data.id_num,
      name: data.name,
      sex: data.sex,
      nationality: data.nationality,
      address: data.address,
      birthDate: data.birth_date,
      issueDate: data.issue_date,
      carClass: data.car_class,
      validFrom: data.valid_from,
      validTo: data.valid_to,
      officialSeal: data.official_seal,
    });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 行驶证识别结果
 */
export interface DrivingResult {
  plateNum?: string;
  vehicleType?: string;
  owner?: string;
  addr?: string;
  useCharacter?: string;
  model?: string;
  vin?: string;
  engineNum?: string;
  registerDate?: string;
  issueDate?: string;
}

/**
 * 行驶证识别
 */
export async function ocrDriving(
  account: ResolvedWechatMpAccount,
  imageUrl: string
): Promise<Result<DrivingResult>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cv/ocr/driving?access_token=${accessToken}&img_url=${encodeURIComponent(imageUrl)}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      plate_num?: string;
      vehicle_type?: string;
      owner?: string;
      addr?: string;
      use_character?: string;
      model?: string;
      vin?: string;
      engine_num?: string;
      register_date?: string;
      issue_date?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    return ok({
      plateNum: data.plate_num,
      vehicleType: data.vehicle_type,
      owner: data.owner,
      addr: data.addr,
      useCharacter: data.use_character,
      model: data.model,
      vin: data.vin,
      engineNum: data.engine_num,
      registerDate: data.register_date,
      issueDate: data.issue_date,
    });
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 通用印刷体识别
 */
export async function ocrCommon(
  account: ResolvedWechatMpAccount,
  imageUrl: string
): Promise<Result<Array<{ text: string; pos: Array<{ x: number; y: number }> }>>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cv/ocr/comm?access_token=${accessToken}&img_url=${encodeURIComponent(imageUrl)}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      items?: Array<{
        text: string;
        pos: { left_top: { x: number; y: number }; right_top: { x: number; y: number }; right_bottom: { x: number; y: number }; left_bottom: { x: number; y: number } };
      }>;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    const items = data.items?.map(item => ({
      text: item.text,
      pos: [
        item.pos.left_top,
        item.pos.right_top,
        item.pos.right_bottom,
        item.pos.left_bottom,
      ],
    })) || [];

    return ok(items);
  } catch (error) {
    return err(String(error));
  }
}

/**
 * 二维码/条码识别
 */
export async function ocrQRCode(
  account: ResolvedWechatMpAccount,
  imageUrl: string
): Promise<Result<Array<{ typeName: string; data: string; pos: { x: number; y: number } }>>> {
  try {
    const accessToken = await getAccessToken(account);
    const url = `${API_BASE}/cv/img/qrcode?access_token=${accessToken}&img_url=${encodeURIComponent(imageUrl)}`;

    const response = await safeFetch(url, undefined, { timeoutMs: DEFAULT_FETCH_TIMEOUT_MS });
    const data = await response.json() as {
      code_results?: Array<{
        type_name: string;
        data: string;
        pos: { left_top: { x: number; y: number } };
      }>;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode && data.errcode !== 0) {
      return err(`${data.errcode} - ${data.errmsg}`);
    }

    const results = data.code_results?.map(r => ({
      typeName: r.type_name,
      data: r.data,
      pos: r.pos.left_top,
    })) || [];

    return ok(results);
  } catch (error) {
    return err(String(error));
  }
}
