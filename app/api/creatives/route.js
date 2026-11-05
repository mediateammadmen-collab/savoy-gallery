import { getCreatives } from "@/lib/dashboard";
import { parseFilters } from "@/lib/filters";
import { getMissingEnv, isMetaApiError } from "@/lib/meta";

export async function GET(request) {
  const missing = getMissingEnv();
  if (missing.length) {
    return Response.json(
      { error: `Missing environment variable: ${missing.join(", ")}`, missing },
      { status: 503 },
    );
  }
  const filters = parseFilters(Object.fromEntries(request.nextUrl.searchParams));
  try {
    return Response.json(await getCreatives(filters));
  } catch (error) {
    if (isMetaApiError(error)) {
      return Response.json({ error: error.message, code: error.code }, { status: 502 });
    }
    throw error;
  }
}
