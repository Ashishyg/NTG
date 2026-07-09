import { guardResponse, isAuthedAdmin, requireSuperAdmin } from "@/lib/superadmin-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import { listQaFormFields, replaceQaFormFields } from "@time-limited-qa/index";
import { replaceQaFormFieldsSchema } from "@time-limited-qa/domain/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSuperAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const fields = await listQaFormFields();
  return NextResponse.json({ fields });
}

export async function PUT(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSuperAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = replaceQaFormFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid fields." },
      { status: 400 },
    );
  }

  const result = await replaceQaFormFields(parsed.data.fields);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "time_limited_qa.fields.update", "qa", {
    fieldCount: result.fields.length,
  });

  return NextResponse.json({ fields: result.fields });
}
