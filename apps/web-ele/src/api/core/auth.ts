import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    captchaToken: string;
    password: string;
    username: string;
  }

  export interface TrackPoint {
    t: number;
    x: number;
    y: number;
  }

  export interface CaptchaPuzzle {
    backgroundImage: string;
    imageHeight: number;
    imageWidth: number;
    movementWidth: number;
    pieceHeight: number;
    pieceImage: string;
    pieceWidth: number;
    pieceY: number;
  }

  export interface CaptchaChallengeResult {
    challengeId: string;
    expiresIn: number;
    proofDifficulty: number;
    proofNonce: string;
    puzzle: CaptchaPuzzle;
  }

  export interface VerifyCaptchaParams {
    challengeId: string;
    duration: number;
    finalX: number;
    proofCounter: number;
    track: TrackPoint[];
    width: number;
  }

  export interface VerifyCaptchaResult {
    captchaToken: string;
    expiresIn: number;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

export async function getCaptchaChallengeApi(signal?: AbortSignal) {
  return requestClient.post<AuthApi.CaptchaChallengeResult>(
    '/auth/captcha/challenge',
    undefined,
    { signal },
  );
}

export async function verifyCaptchaApi(
  data: AuthApi.VerifyCaptchaParams,
  signal?: AbortSignal,
) {
  return requestClient.post<AuthApi.VerifyCaptchaResult>(
    '/auth/captcha/verify',
    data,
    { signal },
  );
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
    withCredentials: true,
  });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.post('/auth/logout', {
    withCredentials: true,
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/system/user/codes');
  // return [];
}
