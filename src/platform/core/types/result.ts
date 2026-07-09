export type PlatformResult<TOk, TError = string> =
  | {
      ok: true;
      value: TOk;
    }
  | {
      ok: false;
      error: TError;
    };
