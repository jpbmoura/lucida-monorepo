/**
 * Vínculo de delegação: um auxiliar (`assistantUserId`) pode entrar na
 * conta de um professor (`teacherUserId`) dentro do contexto de uma
 * organização. Cardinalidade N:N — o mesmo auxiliar pode estar linkado a
 * vários professores, e um professor pode ter vários auxiliares.
 *
 * `revokedAt` faz soft-delete: o link permanece pra auditoria, mas o
 * middleware ignora quando `revokedAt !== null`.
 */
export interface TeacherAssistantProps {
  id: string;
  teacherUserId: string;
  assistantUserId: string;
  organizationId: string;
  /** UserId do admin/owner da org que criou o vínculo. */
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

export class TeacherAssistant {
  private constructor(private props: TeacherAssistantProps) {}

  static create(input: {
    id: string;
    teacherUserId: string;
    assistantUserId: string;
    organizationId: string;
    createdBy: string;
    now?: Date;
  }): TeacherAssistant {
    const now = input.now ?? new Date();
    return new TeacherAssistant({
      id: input.id,
      teacherUserId: input.teacherUserId,
      assistantUserId: input.assistantUserId,
      organizationId: input.organizationId,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    });
  }

  static restore(props: TeacherAssistantProps): TeacherAssistant {
    return new TeacherAssistant({ ...props });
  }

  revoke(now?: Date): void {
    if (this.props.revokedAt) return;
    const when = now ?? new Date();
    this.props.revokedAt = when;
    this.props.updatedAt = when;
  }

  isActive(): boolean {
    return this.props.revokedAt === null;
  }

  get id(): string {
    return this.props.id;
  }
  get teacherUserId(): string {
    return this.props.teacherUserId;
  }
  get assistantUserId(): string {
    return this.props.assistantUserId;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get createdBy(): string {
    return this.props.createdBy;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }
}
