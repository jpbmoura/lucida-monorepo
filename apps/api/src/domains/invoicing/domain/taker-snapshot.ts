/**
 * Snapshot dos dados fiscais do tomador no momento da emissão da nota.
 * Discriminator union: PF tem campos mínimos (CPF + nome + email), PJ
 * tem dados fiscais completos. Org tomadora usa o mesmo formato de PJ —
 * o `organizationId` fica no `Invoice` (caller), não no snapshot.
 *
 * "Snapshot" porque é congelado no `Invoice` quando ele é criado: depois
 * disso, mudar o cadastro do user/org não afeta notas já emitidas. NFS-e
 * já autorizada é imutável fiscalmente.
 */

export type TakerSnapshot = TakerSnapshotPF | TakerSnapshotPJ;

export interface TakerSnapshotPF {
  type: "pf";
  /** Apenas dígitos. */
  cpf: string;
  name: string;
  email: string;
  /**
   * Endereço é opcional pra PF. Alguns municípios aceitam emissão sem;
   * outros (SP capital é o caso clássico) exigem. Quando ausente e o
   * município rejeitar, a Invoice vai pra `failed` e o user precisa
   * preencher pra reemitir.
   */
  address?: TakerAddress | null;
}

export interface TakerSnapshotPJ {
  type: "pj";
  /** Apenas dígitos. */
  cnpj: string;
  legalName: string;
  email: string;
  /** Inscrição Municipal — opcional, exigida em alguns municípios. */
  municipalRegistration?: string | null;
  /** Endereço é obrigatório pra PJ — quase todo município exige. */
  address: TakerAddress;
}

export interface TakerAddress {
  /** Apenas dígitos (8 chars). */
  postalCode: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  /** Código IBGE de 7 dígitos. */
  cityCode: string;
  cityName: string;
  /** UF, 2 letras maiúsculas. */
  stateUf: string;
  /** ISO alpha-2 — default "BR". */
  country: string;
}
