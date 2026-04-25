# State Management (Zustand)

Estado global de UI vive em stores Zustand. Context é reservado para valores de sessão imutáveis. URL é o melhor estado compartilhável.

## Hierarquia de decisão — ONDE colocar estado?

Pergunte nessa ordem:

1. **É derivável de outro estado?** → não é estado. Derive no render (`useMemo` se pesado).
2. **É de um único componente?** → `useState` local.
3. **É passado para 1-2 níveis de filho?** → `useState` no pai + props.
4. **É estado do servidor (dados)?** → server component ou TanStack Query. **Nunca** Zustand.
5. **Deve sobreviver reload / ser compartilhável via link?** → URL (`useSearchParams` / path).
6. **É estado de UI compartilhado entre componentes distantes?** → Zustand.
7. **É config imutável de sessão (tema, locale, user autenticado)?** → Context.

Zustand é a resposta para **estado transient de UI**: modais abertos, sidebar expandida, wizard step atual, filtros de tabela visíveis, toasts pendentes.

## Install

```bash
pnpm add zustand
```

## Anatomia de um store

```ts
// src/stores/use-ui-store.ts
import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;

  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  commandPaletteOpen: false,

  openSidebar:   () => set({ sidebarOpen: true }),
  closeSidebar:  () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  openCommandPalette:  () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
}));
```

**Convenções**:
- Arquivo: `src/stores/use-<nome>-store.ts`.
- Export: `useCamelCaseStore` (Hook naming).
- Interface no mesmo arquivo.
- Actions são funções na store (não reducers externos). Nome de ação: verbo (`openSidebar`, não `setSidebarOpen`).

## Uso em componente

```tsx
"use client";

import { useUiStore } from "@/stores/use-ui-store";

export function SidebarToggle() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  // selecionar só o que usa evita re-render quando outros slices mudam

  return <button onClick={toggleSidebar}>Menu</button>;
}

export function SidebarContent() {
  const isOpen = useUiStore((s) => s.sidebarOpen);
  if (!isOpen) return null;
  return <aside>...</aside>;
}
```

**Regra**: **sempre** use seletor (`(s) => s.x`), nunca desestruture o store inteiro (`const { x, y } = useUiStore()`) — isso causa re-render em qualquer mudança de qualquer slice.

Para múltiplos selects com performance, use `useShallow`:

```tsx
import { useShallow } from "zustand/react/shallow";

const { sidebarOpen, commandPaletteOpen } = useUiStore(
  useShallow((s) => ({
    sidebarOpen: s.sidebarOpen,
    commandPaletteOpen: s.commandPaletteOpen,
  })),
);
```

## Slices para stores grandes

Quando um store cresce (>10 ações), quebre em slices:

```ts
// src/stores/slices/sidebar-slice.ts
import { type StateCreator } from "zustand";

export interface SidebarSlice {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

export const createSidebarSlice: StateCreator<SidebarSlice> = (set) => ({
  sidebarOpen: false,
  openSidebar:  () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
});
```

```ts
// src/stores/slices/command-palette-slice.ts
export interface CommandPaletteSlice { /* ... */ }
export const createCommandPaletteSlice: StateCreator<CommandPaletteSlice> = (set) => ({ /* ... */ });
```

```ts
// src/stores/use-ui-store.ts
import { create } from "zustand";
import { createSidebarSlice, type SidebarSlice } from "./slices/sidebar-slice";
import { createCommandPaletteSlice, type CommandPaletteSlice } from "./slices/command-palette-slice";

type UiState = SidebarSlice & CommandPaletteSlice;

export const useUiStore = create<UiState>()((...a) => ({
  ...createSidebarSlice(...a),
  ...createCommandPaletteSlice(...a),
}));
```

## Persistência (localStorage)

Para preferências do usuário que devem sobreviver reload:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "lucida-preferences",      // key do localStorage
      version: 1,                       // bump ao mudar shape
    },
  ),
);
```

**Cuidado com SSR/hydration**: no primeiro render server, o store usa defaults (localStorage não existe). Soluções:
- Renderize nada até hidratar:

```tsx
const [hydrated, setHydrated] = useState(false);
useEffect(() => setHydrated(true), []);
if (!hydrated) return null;
```

- Ou use `onRehydrateStorage` para marcar hidratação.

Prefira evitar persist para estado de UI transient. Persist **apenas** para preferências que fazem sentido em localStorage (tema, idioma, layout preferido).

## Devtools

```ts
import { devtools } from "zustand/middleware";

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({ /* ... */ }),
    { name: "ui-store" },
  ),
);
```

Aparece no Redux DevTools (extensão do browser). Use só em dev.

## Scope por feature

Stores grandes usados só em uma feature vivem na própria feature:

```
src/features/exam/store.ts     ← useExamEditorStore (wizard step, dirty fields)
src/stores/use-ui-store.ts     ← global (sidebar, command palette)
```

Convenção: se 2+ features precisam, promove para `src/stores/`.

## Quando NÃO usar Zustand

- **Dados do servidor**: use server component ou TanStack Query. Zustand não invalida nem revalida.
- **Form state**: use react-hook-form.
- **Routing state** (qual aba está ativa?): use URL (`?tab=general`) com `useSearchParams`. Deep-linkable, shareable.
- **Estado de um componente**: `useState`. Não tudo precisa ser global.
- **Estado derivado**: calcule no render.

## URL como estado (padrão preferido)

Se faz sentido bookmarkar/compartilhar, vive na URL:

```tsx
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function TabSwitcher() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "general";

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <button onClick={() => setTab("general")} aria-pressed={activeTab === "general"}>Geral</button>
      <button onClick={() => setTab("security")} aria-pressed={activeTab === "security"}>Segurança</button>
    </div>
  );
}
```

Benefícios:
- Voltar/avançar do browser funciona.
- Refresh não perde estado.
- Link compartilhável.
- Server component pode ler via `searchParams` prop.

## Context — quando usar

Para valores **que não mudam frequentemente** e são lidos por muitos componentes:
- Tema (se tiver switch — senão, CSS var em `:root` resolve).
- Locale.
- Usuário autenticado atual (após login).

Não use Context para estado que muda — causa re-render de tudo dentro do provider.

Exemplo (user atual):

```tsx
// src/components/providers/user-provider.tsx
"use client";

import { createContext, useContext } from "react";

const UserContext = createContext<User | null>(null);

export function UserProvider({ user, children }: { user: User; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("useCurrentUser fora do UserProvider");
  return user;
}
```

Use no layout autenticado:

```tsx
// app/(app)/layout.tsx (server component)
export default async function AppLayout({ children }) {
  const user = await requireUser();
  return <UserProvider user={user}>{children}</UserProvider>;
}
```

## Anti-patterns

- ❌ Store Zustand com dado que vem de API. É TanStack Query / server component.
- ❌ `create<State>()(...)` onde State tem 40 campos. Quebrar em slices.
- ❌ Ler store sem seletor: `const store = useUiStore()` → re-render em tudo.
- ❌ Mutar state direto: `state.items.push(x)`. Sempre `set({ items: [...state.items, x] })` ou use Immer via middleware.
- ❌ Context para estado que muda (spinner, counter). Use Zustand.
- ❌ Persist automático de tudo "por garantia". Só o que faz sentido em localStorage.
