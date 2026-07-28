import "server-only";

type GoogleErrorPayload = {
  error?:
    | string
    | {
        message?: string;
        status?: string;
        errors?: Array<{ reason?: string }>;
        details?: Array<{ reason?: string }>;
      };
};

type GoogleError = {
  code?: number | string;
  message?: string;
  response?: {
    status?: number;
    data?: GoogleErrorPayload;
  };
};

function getGoogleError(error: unknown) {
  return error && typeof error === "object" ? (error as GoogleError) : null;
}

export function getGoogleErrorStatus(error: unknown) {
  const value = getGoogleError(error);
  const status = value?.response?.status ?? value?.code;
  return typeof status === "string" ? Number(status) : status;
}

function getGoogleErrorDetails(error: unknown) {
  const value = getGoogleError(error);
  const payload = value?.response?.data?.error;

  if (!payload || typeof payload === "string") {
    return {
      message: [value?.message, payload].filter(Boolean).join(" "),
      reasons: [] as string[],
    };
  }

  return {
    message: [value?.message, payload.message].filter(Boolean).join(" "),
    reasons: [
      payload.status,
      ...(payload.errors?.map((item) => item.reason) ?? []),
      ...(payload.details?.map((item) => item.reason) ?? []),
    ]
      .filter((reason): reason is string => Boolean(reason))
      .map((reason) => reason.toLowerCase()),
  };
}

export function isGoogleApiDisabledError(error: unknown) {
  const details = getGoogleErrorDetails(error);
  return (
    details.reasons.some((reason) =>
      [
        "accessnotconfigured",
        "service_disabled",
        "servicedisabled",
      ].includes(reason),
    ) ||
    /has not been used in project|calendar api.+disabled/i.test(details.message)
  );
}

export function isGooglePermissionError(error: unknown) {
  const details = getGoogleErrorDetails(error);
  return details.reasons.some((reason) =>
    [
      "forbidden",
      "insufficientpermissions",
      "permission_denied",
    ].includes(reason),
  );
}
