import { DomainError } from "@/shared/errors/domain-error.js";

export class RoadmapItemNotFoundError extends DomainError {
  readonly code = "ROADMAP_ITEM_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Item do roadmap não encontrado.");
  }
}

export class RoadmapTitleInvalidError extends DomainError {
  readonly code = "ROADMAP_TITLE_INVALID";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}

export class RoadmapDescriptionInvalidError extends DomainError {
  readonly code = "ROADMAP_DESCRIPTION_INVALID";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}

export class RoadmapStaffNoteInvalidError extends DomainError {
  readonly code = "ROADMAP_STAFF_NOTE_INVALID";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}

export class AlreadyVotedError extends DomainError {
  readonly code = "ALREADY_VOTED";
  readonly statusCode = 409;
  constructor() {
    super("Você já votou nesse item.");
  }
}

export class NotVotedError extends DomainError {
  readonly code = "NOT_VOTED";
  readonly statusCode = 409;
  constructor() {
    super("Você ainda não votou nesse item.");
  }
}

export class InvalidStageTransitionError extends DomainError {
  readonly code = "INVALID_STAGE_TRANSITION";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}
