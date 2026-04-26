import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
      <p className="text-slate-600 mb-4">Página não encontrada</p>
      <Link href="/" className="px-6 py-2 bg-primary text-white rounded-xl font-bold">
        Voltar para a página inicial
      </Link>
    </div>
  );
}
