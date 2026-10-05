
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileCheck, 
  Settings2, 
  Users, 
  DollarSign, 
  CreditCard, 
  BarChart3, 
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Settings,
  Truck,
  FileX,
  PackageOpen,
  PlusSquare,
  Clock,
  RotateCcw,
  ScanBarcode,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { PageId } from '../types';

interface SidebarProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
}

interface MenuItem {
  id: PageId | string;
  label: string;
  icon?: any;
  isHeader?: boolean;
  children?: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('abc_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('abc_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agentes-execucao', label: 'Governança & Agentes', icon: ShieldCheck },
    { 
      id: 'margem', 
      label: 'Margem de Contribuição', 
      isHeader: true,
      children: [
        { id: 'conferencia', label: '1. Vendas Base', icon: FileCheck },
        { id: 'cancelados', label: '2. Cancelados', icon: FileX },
        { id: 'devolvidos', label: '3. Devolvidos', icon: PackageOpen },
        { id: 'ocorrencias', label: '4. Ocorrências', icon: RotateCcw },
        { id: 'ajustes-varios', label: '5. Ajustes Manuais', icon: PlusSquare },
        { id: 'frete', label: '6. Gestão de Fretes', icon: Truck },
        { id: 'ajustes', label: 'Validação Final', icon: Settings2 },
      ]
    },
    { 
      id: 'equipe', 
      label: 'Equipe e Vendas', 
      isHeader: true,
      children: [
        { id: 'analise-vendedor', label: 'Análise Vendedor', icon: Users },
        { id: 'comissao', label: 'Comissão', icon: DollarSign },
        { id: 'horas', label: 'Controle de Horas', icon: Clock },
      ]
    },
    { 
      id: 'financeiro', 
      label: 'Financeiro', 
      isHeader: true,
      children: [
        { id: 'contas-pagar', label: 'Contas a Pagar', icon: CreditCard },
        { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp },
        { id: 'dre', label: 'DRE', icon: BarChart3 },
        { id: 'auditoria-custos', label: 'Raio-X Custos', icon: ScanBarcode },
      ]
    },
    {
      id: 'sistema',
      label: 'Sistema',
      isHeader: true,
      children: [
        { id: 'configuracao', label: 'Configurações', icon: Settings },
      ]
    }
  ];

  const renderItem = (item: MenuItem) => {
    if (item.isHeader) {
      if (isCollapsed) {
        return (
          <div key={item.id} className="my-3 border-t border-slate-100 mx-3 pt-2" title={item.label} />
        );
      }
      return (
        <div key={item.id} className="mt-8 mb-2">
          <p className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</p>
          <div className="mt-2 space-y-1">
            {item.children?.map(child => renderItem(child))}
          </div>
        </div>
      );
    }

    const isActive = activePage === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        type="button"
        title={item.label}
        onClick={() => setActivePage(item.id as PageId)}
        className={`w-full flex items-center transition-colors duration-200 group relative ${
          isCollapsed ? 'justify-center px-0 py-3.5' : 'gap-4 px-6 py-3.5'
        } ${
          isActive 
            ? 'text-[#E30613] bg-red-50/70 font-black' 
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E30613] rounded-r-full" />
        )}
        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'stroke-[2.5px] text-[#E30613]' : 'stroke-2'}`} />
        {!isCollapsed && (
          <>
            <span className="text-xs tracking-wide uppercase truncate text-left flex-1">
              {item.label}
            </span>
            {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50 shrink-0" />}
          </>
        )}
      </button>
    );
  };

  return (
    <aside 
      className={`bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col shadow-xl shadow-slate-200/50 flex-shrink-0 select-none transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-20 min-w-[5rem] max-w-[5rem]' : 'w-64 min-w-[16rem] max-w-[16rem]'
      }`}
    >
      {/* HEADER DA SIDEBAR COM TOGGLE DE RECOLHER */}
      <div className={`border-b border-slate-100 bg-white flex items-center justify-between ${
        isCollapsed ? 'p-4 flex-col gap-3' : 'p-6'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-[#E30613] p-2 rounded-xl shadow-md shadow-red-200 shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 leading-none tracking-tighter uppercase truncate">
                ABC ITU
              </h1>
              <p className="text-[8px] text-red-600 font-black uppercase tracking-[0.2em] mt-1 truncate">
                Gestão Comercial
              </p>
            </div>
          )}
        </div>

        {/* BOTÃO RECOLHER / EXPANDIR SIDEBAR */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
          title={isCollapsed ? "Expandir Menu Lateral" : "Recolher Menu Lateral"}
          aria-label={isCollapsed ? "Expandir Menu Lateral" : "Recolher Menu Lateral"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-slate-600" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-slate-500" />
          )}
        </button>
      </div>

      {/* NAVEGAÇÃO */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        {menuItems.map(item => renderItem(item))}
      </nav>

      {/* FOOTER / PERFIL */}
      <div className={`border-t border-slate-100 bg-slate-50/50 ${isCollapsed ? 'p-3 flex justify-center' : 'p-4'}`}>
        <div className={`flex items-center rounded-2xl border border-slate-200 shadow-sm bg-white ${
          isCollapsed ? 'p-2 justify-center' : 'gap-3 px-3 py-2.5'
        }`} title={isCollapsed ? "Administrador - Unidade Itu/SP" : undefined}>
          <div className="w-7 h-7 rounded-full bg-slate-200 border border-white overflow-hidden shrink-0">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=ABC" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-900 uppercase truncate leading-tight">Administrador</p>
              <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tighter truncate leading-tight">Unidade Itu/SP</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

