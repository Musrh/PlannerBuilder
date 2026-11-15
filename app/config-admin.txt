// Configuration temporaire de développement PlannerBuilder.
// Ce fichier sert uniquement à l'affichage de l'interface.
// Il ne constitue PAS une protection de sécurité.

export const PLANNERBUILDER_ADMIN_UID =
  's4R51uEux5Rmo48OgALEwW55F0k1'

export const isPlannerBuilderAdmin = (user) =>
  Boolean(user && user.uid === PLANNERBUILDER_ADMIN_UID)
