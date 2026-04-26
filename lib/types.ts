export interface Faturamento {
  unidade: 'tubocone' | 'tubonord';
  nome: string;
  subnome?: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  fone: string;
  rod: string;
}

export interface Product {
  desc: string;
  med: string;
  qtd: string;
  un: string;
  ipi: string;
  icms: string;
  cif: string;
  fob: string;
}

export interface QuotationData {
  razaoFaturamento: string;
  cliente: string;
  att: string;
  respComercial: string;
  pagamento: string;
  prazo: string;
  validade: string;
  obs: string;
  produtos: Product[];
}
