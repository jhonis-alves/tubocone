import { FATURAMENTOS, LOGO_TUBOCONE, LOGO_TUBONORD } from './constants';
import { QuotationData, Product } from './types';

export const generateQuotationPdf = async (data: QuotationData) => {
  // Use dynamic imports for jspdf to ensure it works in client context
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  
  const doc = new jsPDF("p", "mm", "a4");
  const azulDark: [number, number, number] = [30, 58, 110];
  const faturamento = FATURAMENTOS[data.razaoFaturamento];

  if (!faturamento) {
    throw new Error('Faturamento não selecionado');
  }

  // --- CABEÇALHO AZUL ---
  doc.setFillColor(...azulDark);
  doc.rect(0, 0, 210, 35, "F");

  // Adicionar Logo
  try {
    const logoBase64 = faturamento.unidade === "tubocone" ? LOGO_TUBOCONE : LOGO_TUBONORD;
    
    // Check if logo is a valid PNG base64 to avoid "wrong PNG signature"
    if (logoBase64 && logoBase64.startsWith('data:image/png')) {
      doc.addImage(logoBase64, 'PNG', 12, 5, 40, 25);
    } else {
      // Fallback: Desenha um logo vetorial limpo se não houver PNG válido
      // Isso evita o erro "wrong PNG signature" com SVGs que o jsPDF não suporta nativamente em addImage
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 7, 43, 20, 1, 1, "F");
      
      doc.setTextColor(...azulDark);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const logoText = faturamento.unidade === "tubocone" ? "TUBOCONE" : "TUBONORD";
      doc.text(logoText, 15, 18);
      
      doc.setDrawColor(...azulDark);
      doc.setLineWidth(0.5);
      doc.line(15, 20, 50, 20);
    }
  } catch (e) {
    console.error("Erro ao carregar imagem no PDF", e);
    // Garantir que o texto do cabeçalho não fique vazio se a imagem falhar
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(faturamento.unidade.toUpperCase(), 12, 20);
  }

  // Título do cabeçalho
  const tituloUnidade = faturamento.unidade === "tubocone"
    ? "TUBOCONE INDÚSTRIA E COMÉRCIO DE EMBALAGENS"
    : "TUBONORD INDUSTRIA E COMERCIO DE EMBALAGENS";

  doc.setTextColor(255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(tituloUnidade, 60, 15);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${faturamento.endereco}\n${faturamento.cidade}\n${faturamento.fone}`, 60, 20);

  // --- CORPO DO DOCUMENTO ---
  doc.setTextColor(...azulDark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("COTAÇÃO DE PRODUTOS", 15, 48);

  const dataAtual = new Date().toLocaleDateString("pt-BR");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(`Emissão: ${dataAtual}`, 195, 48, { align: "right" });

  // --- BOXES CLIENTE / FORNECEDOR ---
  doc.setFillColor(245, 248, 254);
  doc.rect(15, 55, 85, 25, "F");
  doc.setTextColor(150);
  doc.setFontSize(7);
  doc.text("RAZÃO SOCIAL DE FATURAMENTO (FORNECEDOR)", 18, 59);

  doc.setTextColor(0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const nomeExibir = faturamento.subnome
    ? `${faturamento.nome} (${faturamento.subnome})`
    : faturamento.nome;
  doc.text(nomeExibir, 18, 64, { maxWidth: 80 });
  doc.setFont("helvetica", "normal");
  doc.text("CNPJ: " + faturamento.cnpj, 18, 75);

  // Box Cliente
  doc.setFillColor(250, 250, 250);
  doc.rect(110, 55, 85, 25, "F");
  doc.setTextColor(150);
  doc.setFontSize(7);
  doc.text("CLIENTE", 113, 59);
  doc.setTextColor(0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.cliente.toUpperCase(), 113, 64, { maxWidth: 80 });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("SOLICITADO POR: " + data.att.toUpperCase(), 113, 74);

  // --- TABELA DE PRODUTOS ---
  const valorOk = (t: string | number) => {
    if (!t) return false;
    const numericStr = t.toString().replace(/\D/g, "");
    return numericStr !== "" && parseInt(numericStr, 10) !== 0;
  };

  const columnsDef = [
    { header: "PRODUTO", key: "desc" as keyof Product },
    { header: "MEDIDAS", key: "med" as keyof Product },
    { header: "QTD", key: "qtd" as keyof Product },
    { header: "UND", key: "un" as keyof Product },
    { header: "IPI", key: "ipi" as keyof Product, suffix: "%", checkValor: true },
    { header: "ICMS", key: "icms" as keyof Product, suffix: "%", checkValor: true },
    { header: "VALOR CIF", key: "cif" as keyof Product, prefix: "R$ ", isMonetary: true, checkValor: true },
    { header: "VALOR FOB", key: "fob" as keyof Product, prefix: "R$ ", isMonetary: true, checkValor: true },
  ];

  // Filter columns that have at least one valid value in any product
  const activeColsDef = columnsDef.filter(col => {
    return data.produtos.some(p => {
      const val = p[col.key];
      if (col.checkValor) {
        return valorOk(val);
      }
      // For basic fields like desc, med, qtd, un, we just check if it's not empty
      return val !== undefined && val !== null && val.toString().trim() !== "";
    });
  });

  const cols = activeColsDef.map(c => c.header);

  const rows = data.produtos.map((p) => {
    return activeColsDef.map(col => {
      const val = p[col.key];
      
      if (col.checkValor) {
        return valorOk(val) ? (col.prefix || "") + val + (col.suffix || "") : "---";
      }
      
      if (val === undefined || val === null || val.toString().trim() === "") {
        return "---";
      }
      
      return val;
    });
  });

  autoTable(doc, {
    startY: 90,
    head: [cols],
    body: rows,
    headStyles: { fillColor: azulDark, fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 7, halign: "center" },
    theme: "grid",
  });

  // --- CONDIÇÕES E ASSINATURA ---
  let y = (doc as any).lastAutoTable.finalY + 15;
  const conds = ["PRAZO ENTREGA", "COND. PAGAMENTO", "VALIDADE DA COTAÇÃO"];
  const vals = [
    data.prazo + " DIAS",
    data.pagamento + " DIAS",
    data.validade + " DIAS",
  ];

  for (let i = 0; i < 3; i++) {
    let x = 15 + i * 62;
    doc.setFillColor(232, 237, 247);
    doc.rect(x, y, 58, 15, "F");
    doc.setTextColor(100);
    doc.setFontSize(7);
    doc.text(conds[i], x + 5, y + 5);
    doc.setTextColor(azulDark[0], azulDark[1], azulDark[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(vals[i], x + 5, y + 11);
  }

  y += 25;
  const observacaoTexto = data.obs.trim();
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y, 180, 20, "F");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVAÇÕES:", 18, y + 5);

  if (observacaoTexto) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    const linhasObs = doc.splitTextToSize(observacaoTexto.toUpperCase(), 174);
    doc.text(linhasObs, 18, y + 10);
  }

  let ySig = y + 40;
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.respComercial.toUpperCase(), 160, ySig - 2, { align: "center" });
  doc.line(130, ySig, 190, ySig);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Responsável Comercial", 160, ySig + 5, { align: "center" });

  // --- RODAPÉ AZUL ---
  doc.setFillColor(...azulDark);
  doc.rect(0, 282, 210, 15, "F");
  doc.setTextColor(255);
  doc.setFontSize(7);
  doc.text(`${faturamento.nome} | ${faturamento.rod}`, 105, 290, { align: "center" });

  // --- SOLUÇÃO PARA MOBILE: Retorna o Blob URL para download manual ---
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};

