import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const role = (user?.app_metadata?.role as string | undefined) ?? "admin";
  const isCliente = role === "cliente";

  const isPublicPath = path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/demo") ||
    path === "/favicon.ico";

  if (isPublicPath) return supabaseResponse;

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    return NextResponse.redirect(url);
  };

  // ── Área do portal (cliente) ────────────────────────────────────────────────
  if (path.startsWith("/portal")) {
    const isPortalLogin = path === "/portal/login";
    if (!user && !isPortalLogin) return redirectTo("/portal/login");
    if (user && isPortalLogin) return redirectTo("/portal");
    return supabaseResponse;
  }

  // ── Área administrativa (ERP) ───────────────────────────────────────────────
  const isLoginPage = path === "/login";

  // Clientes não acessam o ERP — sempre vão para o portal
  if (user && isCliente) return redirectTo("/portal");

  if (!user && !isLoginPage) return redirectTo("/login");
  if (user && isLoginPage) return redirectTo("/");

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
