# Capability Compliance Checklist

> Este checklist determina se uma Capability está em conformidade com a Operational Context Engineering.

---

## Estrutura

- [ ] Possui Contract.
- [ ] Possui Operations.
- [ ] Possui Events.
- [ ] Possui Policies.
- [ ] Possui Validators.
- [ ] Possui catálogo de Errors.
- [ ] Possui Adapter(s).
- [ ] Possui Self Check.

---

## Arquitetura

- [ ] Não depende de rotas HTTP.
- [ ] Não depende de Next.js.
- [ ] Não depende de interface gráfica.
- [ ] Não depende diretamente do banco de dados.
- [ ] Pode ser utilizada por APIs.
- [ ] Pode ser utilizada por Agentes.
- [ ] Pode ser utilizada por Produtos.

---

## Operações

- [ ] Todas as operações possuem contrato.
- [ ] Todas retornam PlatformResult.
- [ ] Todas produzem eventos quando necessário.
- [ ] Todas respeitam políticas.

---

## Validação

- [ ] Capability registrada no Registry.
- [ ] Self Check aprovado.
- [ ] Validate Capability aprovado.

---

Resultado

Capability compatível com a OCE:

SIM / NÃO
