import { types } from "util";

export function isError(subject: unknown): subject is Error {
  return subject instanceof Error || types.isNativeError(subject);
}

export function unknownToError(subject: unknown) {
  if (isError(subject)) {
    return subject as Error;
  }

  return new Error(String(subject));
}
