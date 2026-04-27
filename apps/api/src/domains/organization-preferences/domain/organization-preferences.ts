import {
  DEFAULT_MATRICULA_SCOPE,
  MATRICULA_SCOPES,
  type MatriculaScope,
} from "./matricula-scope.js";
import { InvalidMatriculaScopeError } from "./organization-preferences-errors.js";

export interface OrganizationPreferencesProps {
  organizationId: string;
  matriculaScope: MatriculaScope;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Preferências operacionais da organização. Coleção dedicada (separada
 * de billing) — primeira pref é matriculaScope, outras (timezone, idioma,
 * formato de export) entram aqui no futuro.
 *
 * Cada org tem 0 ou 1 doc — `_id` = organizationId. A ausência do doc
 * implica defaults (matriculaScope = "teacher").
 */
export class OrganizationPreferences {
  private constructor(private props: OrganizationPreferencesProps) {}

  static create(input: {
    organizationId: string;
    matriculaScope?: MatriculaScope;
    now?: Date;
  }): OrganizationPreferences {
    const scope = input.matriculaScope ?? DEFAULT_MATRICULA_SCOPE;
    if (!MATRICULA_SCOPES.includes(scope)) {
      throw new InvalidMatriculaScopeError(scope);
    }
    const now = input.now ?? new Date();
    return new OrganizationPreferences({
      organizationId: input.organizationId,
      matriculaScope: scope,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Constrói o "doc default" pra orgs que ainda não persistiram nada. */
  static defaultsFor(organizationId: string): OrganizationPreferences {
    const now = new Date();
    return new OrganizationPreferences({
      organizationId,
      matriculaScope: DEFAULT_MATRICULA_SCOPE,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: OrganizationPreferencesProps): OrganizationPreferences {
    return new OrganizationPreferences({ ...props });
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get matriculaScope(): MatriculaScope {
    return this.props.matriculaScope;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  changeMatriculaScope(value: MatriculaScope, now: Date = new Date()): void {
    if (!MATRICULA_SCOPES.includes(value)) {
      throw new InvalidMatriculaScopeError(value);
    }
    this.props.matriculaScope = value;
    this.props.updatedAt = now;
  }
}
