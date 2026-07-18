import { NextResponse } from "next/server"

const DEFAULT_PER_PAGE = 20
const MAX_PER_PAGE = 100

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

/** Pagination `?page=&perPage=` — bornée pour éviter un `take` non maîtrisé. */
export function parsePagination(url: string): { page: number; perPage: number; skip: number; take: number } {
  const searchParams = new URL(url).searchParams

  const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  const perPageParam = Number.parseInt(searchParams.get("perPage") ?? "", 10)
  const perPage = Number.isFinite(perPageParam) && perPageParam > 0 ? Math.min(perPageParam, MAX_PER_PAGE) : DEFAULT_PER_PAGE

  return { page, perPage, skip: (page - 1) * perPage, take: perPage }
}

/** Enveloppe de succès `{ data, meta? }` — format cohérent de l'API publique v1 (ITEM-053). */
export function apiSuccess<T>(data: T, meta?: PaginationMeta, status = 200) {
  return NextResponse.json(meta ? { data, meta } : { data }, { status })
}

export function apiSuccessList<T>(items: T[], total: number, page: number, perPage: number) {
  return apiSuccess(items, { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) })
}

/** Enveloppe d'erreur `{ error: { code, message } }` — format cohérent de l'API publique v1 (ITEM-053). */
export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status })
}
