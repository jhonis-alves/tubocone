import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FATURAMENTOS, LOGO_TUBOCONE, LOGO_TUBONORD } from './constants';
import { QuotationData, Product } from './types';

export const generateQuotationPdf = async (data: QuotationData) => {
  const doc = new jsPDF("p", "mm", "a4", true);
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
      const imgProps = doc.getImageProperties(logoBase64);
      const width = 28; 
      const height = (imgProps.height * width) / imgProps.width;
      const yPos = (35 - height) / 2;
      doc.addImage(logoBase64, 'PNG', 12, yPos, width, height, undefined, 'FAST');
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
  doc.setFillColor(232, 237, 247);
  doc.rect(15, 55, 85, 25, "F");
  doc.setTextColor(100);
  doc.setFontSize(10.5);
  doc.text("RAZÃO SOCIAL DE FATURAMENTO", 18, 59.5);

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const nomeExibir = faturamento.subnome
    ? `${faturamento.nome} (${faturamento.subnome})`
    : faturamento.nome;
  doc.text(nomeExibir, 18, 65, { maxWidth: 80 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("CNPJ: " + faturamento.cnpj, 18, 76);

  // Box Cliente
  doc.setFillColor(232, 237, 247);
  doc.rect(110, 55, 85, 25, "F");
  doc.setTextColor(100);
  doc.setFontSize(10.5);
  doc.text("CLIENTE", 113, 59.5);
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.cliente.toUpperCase(), 113, 65, { maxWidth: 80 });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.setFontSize(9);
  doc.text("SOLICITADO POR: " + data.att.toUpperCase(), 113, 76);

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
    { header: "PREÇO UNITÁRIO CIF", key: "cif" as keyof Product, prefix: "R$ ", isMonetary: true, checkValor: true },
    { header: "PREÇO UNITÁRIO FOB", key: "fob" as keyof Product, prefix: "R$ ", isMonetary: true, checkValor: true },
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
      let val = p[col.key];
      
      // --- MAPEAMENTO DE UNIDADES ---
      if (col.key === "un" && val?.toString().toLowerCase() === "pcs") {
        val = "PC";
      }
      
      if (col.checkValor) {
        if (!valorOk(val)) return "---";
        
        let displayVal = val.toString();
        
        // Formatação monetária (garantir duas casas decimais no padrão PT-BR)
        if (col.isMonetary) {
          // Se não houver vírgula, adiciona ",00"
          if (!displayVal.includes(",")) {
            displayVal += ",00";
          } else {
            // Se houver vírgula, garante que tenha 2 dígitos após ela
            const partes = displayVal.split(",");
            if (partes[1].length === 0) displayVal += "00";
            else if (partes[1].length === 1) displayVal += "0";
          }
        }
        
        return (col.prefix || "") + displayVal + (col.suffix || "");
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
    headStyles: { fillColor: azulDark, fontSize: 9, halign: "center" },
    bodyStyles: { fontSize: 8.5, halign: "center" },
    theme: "grid",
  });

  // --- CONDIÇÕES E ASSINATURA ---
  let y = (doc as any).lastAutoTable.finalY + 15;
  const conds = ["PRAZO ENTREGA", "COND. PAGAMENTO", "VALIDADE DA COTAÇÃO"];
  const displayPrazo = /^[0-9/]+$/.test(data.prazo.trim()) ? `${data.prazo.trim()} DIAS` : data.prazo;
  const displayPagamento = /^[0-9/]+$/.test(data.pagamento.trim()) ? `${data.pagamento.trim()} DIAS` : data.pagamento;
  const vals = [
    displayPrazo,
    displayPagamento,
    data.validade + " DIAS",
  ];

  for (let i = 0; i < 3; i++) {
    let x = 15 + i * 62;
    doc.setFillColor(232, 237, 247);
    doc.rect(x, y, 58, 20, "F");
    doc.setTextColor(100);
    doc.setFontSize(10.5);
    doc.text(conds[i], x + 5, y + 6);
    
    doc.setTextColor(azulDark[0], azulDark[1], azulDark[2]);
    doc.setFont("helvetica", "bold");
    
    // Ajustar texto com quebra de linha se necessário
    const valText = vals[i].toUpperCase();
    const lines = doc.splitTextToSize(valText, 48);
    
    // Ajustar tamanho da fonte se houver muitas linhas
    if (lines.length > 2) {
      doc.setFontSize(8);
    } else if (lines.length > 1) {
      doc.setFontSize(9);
    } else {
      doc.setFontSize(11);
    }
    
    // Centralizar verticalmente o texto dentro do espaço restante do box
    const textY = lines.length > 1 ? y + 11 : y + 14;
    doc.text(lines, x + 5, textY);
  }

  y += 30;
  const observacaoTexto = data.obs.trim();
  doc.setFillColor(232, 237, 247);
  doc.rect(15, y, 180, 25, "F");
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVAÇÕES:", 18, y + 6);

  if (observacaoTexto) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    const linhasObs = doc.splitTextToSize(observacaoTexto.toUpperCase(), 174);
    doc.text(linhasObs, 18, y + 12);
  }

  let ySig = y + 45;
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.respComercial.toUpperCase(), 160, ySig - 2, { align: "center" });
  doc.line(130, ySig, 190, ySig);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Responsável Comercial", 160, ySig + 6, { align: "center" });

  // --- RODAPÉ AZUL ---
  doc.setFillColor(...azulDark);
  doc.rect(0, 282, 210, 15, "F");
  doc.setTextColor(255);
  doc.setFontSize(7);
  doc.text(`${faturamento.nome} | ${faturamento.rod}`, 105, 290, { align: "center" });

  // --- SOLUÇÃO PARA MOBILE: Retorna o Blob para download eficiente ---
  return doc.output('blob');
};

