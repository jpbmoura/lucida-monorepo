// Opções fechadas dos campos do perfil. Os slugs são persistidos no banco —
// não renomear sem migração. Labels podem mudar livremente.

export interface Option {
  value: string;
  label: string;
}

export const INSTITUTION_TYPES: Option[] = [
  { value: "escola_publica", label: "Escola pública" },
  { value: "escola_privada", label: "Escola privada" },
  { value: "rede_escolas", label: "Rede de escolas" },
  { value: "universidade", label: "Universidade" },
  { value: "cursinho", label: "Cursinho" },
  { value: "particular", label: "Aulas particulares" },
  { value: "outro", label: "Outro" },
];

export const GENDERS: Option[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "nao_binario", label: "Não-binário" },
  { value: "prefiro_nao_informar", label: "Prefiro não informar" },
];

export const TEACHING_LEVELS: Option[] = [
  { value: "fundamental_1", label: "Fundamental I" },
  { value: "fundamental_2", label: "Fundamental II" },
  { value: "medio", label: "Ensino Médio" },
  { value: "tecnico", label: "Técnico" },
  { value: "superior", label: "Superior" },
  { value: "eja", label: "EJA" },
];

export const SUBJECTS: Option[] = [
  { value: "matematica", label: "Matemática" },
  { value: "portugues", label: "Português" },
  { value: "redacao", label: "Redação" },
  { value: "literatura", label: "Literatura" },
  { value: "historia", label: "História" },
  { value: "geografia", label: "Geografia" },
  { value: "ciencias", label: "Ciências" },
  { value: "biologia", label: "Biologia" },
  { value: "fisica", label: "Física" },
  { value: "quimica", label: "Química" },
  { value: "ingles", label: "Inglês" },
  { value: "espanhol", label: "Espanhol" },
  { value: "filosofia", label: "Filosofia" },
  { value: "sociologia", label: "Sociologia" },
  { value: "artes", label: "Artes" },
  { value: "educacao_fisica", label: "Educação Física" },
  { value: "outros", label: "Outros" },
];

export const ACQUISITION_CHANNELS: Option[] = [
  { value: "indicacao", label: "Indicação de alguém" },
  { value: "google", label: "Google" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "evento", label: "Evento / palestra" },
  { value: "outro", label: "Outro" },
];

export const STUDENTS_RANGES: Option[] = [
  { value: "ate_30", label: "Até 30 alunos" },
  { value: "30_100", label: "30 a 100 alunos" },
  { value: "100_300", label: "100 a 300 alunos" },
  { value: "mais_300", label: "Mais de 300" },
];

export const TEACHING_YEARS: Option[] = [
  { value: "menos_1", label: "Menos de 1 ano" },
  { value: "1_3", label: "1 a 3 anos" },
  { value: "3_10", label: "3 a 10 anos" },
  { value: "mais_10", label: "Mais de 10 anos" },
];

export const STATE_UFS: Option[] = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];
