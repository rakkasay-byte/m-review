// app/api/diag/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const mask = (s?: string, n = 6) => (s ? `${s.slice(0, n)}...` : "undefined");

export async function GET() {
  const env = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKeyMasked: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    const { data, error, status } = await supabase
      .from("manga")
      .select("id")
      .limit(5);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          status,
          error: {
            message: error.message,
            code: (error as any).code,
            details: (error as any).details,
            hint: (error as any).hint,
          },
          env,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, count: data?.length ?? 0, sample: data, env });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, caught: { message: e?.message, stack: e?.stack }, env },
      { status: 500 }
    );
  }
}