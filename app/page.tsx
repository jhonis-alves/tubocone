"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Edit2, FileText, X, Check, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { FATURAMENTOS, PRODUCT_DESCRIPTIONS, LOGO_TUBOCONE, LOGO_TUBONORD } from "@/lib/constants";
import { generateQuotationPdf } from "@/lib/pdf-generator";
import { Product } from "@/lib/types";

const productSchema = z.object({
  desc: z.string().min(1, "Obrigatório"),
  med: z.string().min(1, "Obrigatório"),
  qtd: z.string().min(1, "Obrigatório"),
  un: z.string(),
  ipi: z.string(),
  icms: z.string(),
  cif: z.string(),
  fob: z.string(),
});

const quotationSchema = z.object({
  razaoFaturamento: z.string().min(1, "Selecione a unidade"),
  cliente: z.string().min(1, "Obrigatório"),
  att: z.string().min(1, "Obrigatório"),
  respComercial: z.string().min(1, "Obrigatório"),
  pagamento: z.string().min(1, "Obrigatório"),
  prazo: z.string().min(1, "Obrigatório"),
  validade: z.string().min(1, "Obrigatório"),
  obs: z.string(),
  produtos: z.array(productSchema).min(1, "Adicione pelo menos um produto"),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

export default function QuotationPage() {
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    resetField,
    formState: { errors },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      razaoFaturamento: "",
      cliente: "",
      att: "",
      respComercial: "",
      pagamento: "",
      prazo: "",
      validade: "",
      obs: "",
      produtos: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "produtos",
  });

  const currentFaturamento = watch("razaoFaturamento");
  const unidad = currentFaturamento ? FATURAMENTOS[currentFaturamento]?.unidade : null;

  // Temp product state
  const [tempProduct, setTempProduct] = useState<Partial<Product>>({ un: "KG" });

  const onSubmit = async (data: QuotationFormValues) => {
    try {
      await generateQuotationPdf(data);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar o PDF da cotação.");
    }
  };

  const handleAddProduct = () => {
    if (!tempProduct.desc || !tempProduct.med || !tempProduct.qtd) {
      alert("Preencha Descrição, Medidas e Qtd!");
      return;
    }

    const newProduct = {
      desc: tempProduct.desc!,
      med: tempProduct.med!.toUpperCase(),
      qtd: tempProduct.qtd!,
      un: tempProduct.un || "KG",
      ipi: tempProduct.ipi || "0",
      icms: tempProduct.icms || "0",
      cif: tempProduct.cif || "0,00",
      fob: tempProduct.fob || "0,00",
    };

    if (editingIndex !== null) {
      update(editingIndex, newProduct);
      setEditingIndex(null);
    } else {
      append(newProduct);
    }

    setTempProduct({ un: "KG" });
    setIsAddingProduct(false);
  };

  const startEditProduct = (index: number) => {
    setTempProduct(fields[index]);
    setEditingIndex(index);
    setIsAddingProduct(true);
  };

  const applyMask = (value: string) => {
    let raw = value.replace(/\D/g, "");
    return raw.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  };

  const formatCurrencyInput = (value: string) => {
    // Basic currency mock for the input display
    return value;
  };

  return (
    <div className="min-h-screen">
      {/* Dynamic Header */}
      <header className="fixed top-0 left-0 right-0 h-20 md:h-24 bg-primary text-white z-50 flex items-center justify-center shadow-lg transition-all duration-500 overflow-hidden">
        <div className="container flex items-center justify-center gap-6 md:gap-12 h-full px-4 text-center">
           {/* Logo Tubocone */}
           <div className={cn("transition-all duration-500 flex flex-col items-center flex-shrink-0", unidad === 'tubonord' ? "opacity-30 blur-[1px]" : "opacity-100")}>
              <div className="w-24 md:w-48 h-12 md:h-20 flex items-center justify-center">
                 <img src={LOGO_TUBOCONE} alt="Tubocone" className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-sm" />
              </div>
           </div>
           
           <div className="h-8 md:h-10 w-px bg-white/10 hidden md:block" />

           <div className="flex-col items-center justify-center min-w-0 flex-1 md:flex-none hidden md:flex">
              <h1 className="text-sm md:text-2xl font-bold tracking-tight uppercase leading-none whitespace-nowrap">Emissor de Cotação</h1>
           </div>

           <div className="h-8 md:h-10 w-px bg-white/10 hidden md:block" />

           {/* Logo Tubonord */}
           <div className={cn("transition-all duration-500 flex flex-col items-center flex-shrink-0", unidad === 'tubocone' ? "opacity-30 blur-[1px]" : (unidad ? "opacity-100" : "opacity-30"))}>
              <div className="w-24 md:w-48 h-12 md:h-20 flex items-center justify-center">
                 <img src={LOGO_TUBONORD} alt="Tubonord" className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-sm" />
              </div>
           </div>
        </div>
      </header>

      <main className="pt-32 pb-20 container max-w-4xl mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-10"
        >
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Nova Cotação</h2>
            <p className="text-slate-500 text-sm">Preencha os campos abaixo para gerar o documento PDF.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {/* Unidade Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Unidade Emissora</h3>
              </div>
              <div className="space-y-1">
                <select
                  {...register("razaoFaturamento")}
                  className={cn(
                    "w-full p-3 border-2 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none bg-slate-50",
                    errors.razaoFaturamento ? "border-error bg-red-50" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <option value="">Selecione a unidade de faturamento...</option>
                  <optgroup label="Unidade Ceará (Tubocone)">
                    <option value="tubotecnico">TUBOTÉCNICO INDUSTRIA E COMERCIO</option>
                    <option value="tubocone">TUBOCONE INDUSTRIA E COMERCIO</option>
                    <option value="palmeiras_filial">PALMEIRAS (Filial)</option>
                  </optgroup>
                  <optgroup label="Unidade Pernambuco (Tubonord)">
                    <option value="tubonord">TUBONORD INDUSTRIA E COMERCIO</option>
                    <option value="palmeiras_matriz">PALMEIRAS (Matriz)</option>
                  </optgroup>
                </select>
                {errors.razaoFaturamento && (
                  <p className="text-[10px] text-red-500 font-bold ml-2 uppercase tracking-wide">{errors.razaoFaturamento.message}</p>
                )}
              </div>
            </section>

            {/* Cliente Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Dados do Cliente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">EMPRESA (DESTINATÁRIA):</label>
                  <input
                    {...register("cliente")}
                    className={cn(
                      "w-full p-3 border-2 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all",
                      errors.cliente ? "border-error bg-red-50" : "border-slate-100 bg-slate-50/50 hover:bg-white"
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">SOLICITADO POR:</label>
                  <input
                    {...register("att")}
                    className={cn(
                      "w-full p-3 border-2 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all",
                      errors.att ? "border-error bg-red-50" : "border-slate-100 bg-slate-50/50 hover:bg-white"
                    )}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Responsável Comercial</label>
                  <input
                    {...register("respComercial")}
                    className={cn(
                      "w-full p-3 border-2 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all",
                      errors.respComercial ? "border-error bg-red-50" : "border-slate-100 bg-slate-50/50 hover:bg-white"
                    )}
                  />
                </div>
              </div>
            </section>

            {/* Itens Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Itens da Cotação</h3>
                 </div>
                 {errors.produtos && (
                   <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                     {errors.produtos.message}
                   </span>
                 )}
              </div>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {fields.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-slate-100 transition-all gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800 text-sm uppercase">{item.desc}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 font-medium">
                             <span>Med: {item.med}</span>
                             <span>Qtd: {item.qtd} {item.un}</span>
                             <span>IPI: {item.ipi}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEditProduct(index)}
                          className="p-2 h-9 w-9 rounded-full hover:bg-blue-50 text-blue-600 transition-colors flex items-center justify-center"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 h-9 w-9 rounded-full hover:bg-red-50 text-red-600 transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {!isAddingProduct && (
                  <button
                    type="button"
                    onClick={() => setIsAddingProduct(true)}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary/30 hover:text-primary hover:bg-primary/[0.02] transition-all flex items-center justify-center gap-2 text-sm font-bold"
                  >
                    <Plus className="w-5 h-5" /> Adicionar Produto
                  </button>
                )}

                {isAddingProduct && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-50 rounded-2xl border-2 border-primary/20 p-6 space-y-6 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                        {editingIndex !== null ? "Editar Produto" : "Novo Produto"}
                      </h4>
                      <button type="button" onClick={() => setIsAddingProduct(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descrição</label>
                        <select
                          value={tempProduct.desc || ""}
                          onChange={(e) => setTempProduct({ ...tempProduct, desc: e.target.value })}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none appearance-none"
                        >
                          <option value="">Selecione um produto...</option>
                          {PRODUCT_DESCRIPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Medidas</label>
                          <input
                            value={tempProduct.med || ""}
                            onChange={(e) => setTempProduct({ ...tempProduct, med: e.target.value.toUpperCase() })}
                            placeholder="Ex: 50x50"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Quantidade</label>
                          <input
                            value={tempProduct.qtd || ""}
                            onChange={(e) => setTempProduct({ ...tempProduct, qtd: applyMask(e.target.value) })}
                            placeholder="0"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Unidade</label>
                          <select
                            value={tempProduct.un || "KG"}
                            onChange={(e) => setTempProduct({ ...tempProduct, un: e.target.value })}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none"
                          >
                            <option value="KG">KG</option>
                            <option value="und">UND</option>
                            <option value="pcs">PÇS</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">IPI %</label>
                          <input
                            value={tempProduct.ipi || ""}
                            onChange={(e) => setTempProduct({ ...tempProduct, ipi: e.target.value })}
                            placeholder="0"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">ICMS %</label>
                          <input
                            value={tempProduct.icms || ""}
                            onChange={(e) => setTempProduct({ ...tempProduct, icms: e.target.value })}
                            placeholder="0"
                             className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Unit. CIF</label>
                          <input
                            value={tempProduct.cif || ""}
                            onChange={(e) => setTempProduct({ ...tempProduct, cif: e.target.value })}
                            placeholder="0,00"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Unit. FOB</label>
                          <input
                            value={tempProduct.fob || ""}
                            onChange={(e) => setTempProduct({ ...tempProduct, fob: e.target.value })}
                            placeholder="0,00"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                       <button
                        type="button"
                        onClick={() => setIsAddingProduct(false)}
                        className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddProduct}
                        className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm"
                      >
                        <Check className="w-4 h-4" /> {editingIndex !== null ? "Salvar Alterações" : "Adicionar Item"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </section>

            {/* Condições Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Condições de Venda</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                   <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Pagamento (Dias)</label>
                   <input
                    {...register("pagamento")}
                    className={cn(
                      "w-full p-3 border-2 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all",
                      errors.pagamento ? "border-error bg-red-50" : "border-slate-100 bg-white"
                    )}
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Prazo Entrega (Dias)</label>
                   <input
                    {...register("prazo")}
                    className={cn(
                      "w-full p-3 border-2 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all",
                      errors.prazo ? "border-error bg-red-50" : "border-slate-100 bg-white"
                    )}
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Validade (Dias)</label>
                   <input
                    {...register("validade")}
                    className={cn(
                      "w-full p-3 border-2 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all",
                      errors.validade ? "border-error bg-red-50" : "border-slate-100 bg-white"
                    )}
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                   <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Observações Adicionais</label>
                   <textarea
                    {...register("obs")}
                    rows={3}
                    className="w-full p-4 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-white resize-none"
                    placeholder="Informações complementares sobre a cotação..."
                  />
                </div>
              </div>
            </section>

            <div className="pt-6">
               <button
                  type="submit"
                  className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary/95 transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 group active:scale-[0.98]"
                >
                  <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                  GERAR COTAÇÃO PDF
                </button>
            </div>
          </form>
        </motion.div>

        <footer className="mt-8 text-center text-slate-400 text-[10px] font-medium uppercase tracking-[0.2em]">
           &copy; {new Date().getFullYear()} Grupo Tubocone &bull; Tubonord &bull; Sistema Interno
        </footer>
      </main>
    </div>
  );
}
