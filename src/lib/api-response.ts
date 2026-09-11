import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  trace_id: string;
};

export type ApiErrorResponse = {
  success: false;
  error: { code: string; message: string };
  trace_id: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

const traceId = () => randomUUID();

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    { success: true, data, trace_id: traceId() },
    { status },
  );
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error: { code, message }, trace_id: traceId() },
    { status },
  );
}
