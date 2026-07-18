/**
 * Ré-export historique (ITEM-077) : l'en-tête des pages liste CRUD a été
 * généralisé à toute page de l'app par ITEM-085 — `PageHeader` en est
 * désormais l'implémentation unique, `ListPageHeader` reste un alias pour ne
 * pas casser les imports existants (`@/components/crud`).
 */
export { PageHeader as ListPageHeader, type PageHeaderAction } from "@/components/layout/PageHeader"
