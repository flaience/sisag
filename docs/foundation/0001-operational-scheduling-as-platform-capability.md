# ADR-0001 — Operational Scheduling as Platform Capability

## Status

Accepted

## Context

The Flaience platform is evolving from product-specific software into a reusable Operational Intelligence Platform.

SISAG is the first implementation of this platform, but scheduling must not be treated as a SISAG-only feature.

Scheduling appears in multiple operational realities:

- services;
- real estate;
- consulting;
- health;
- beauty;
- education;
- professional services;
- internal corporate resources.

If scheduling is modeled as a product-specific module, future Flaience products will duplicate concepts, rules, components, events and integrations.

## Decision

Operational Scheduling will be treated as a reusable platform capability.

It will be specified through:

```txt
docs/operational-specifications/OPS-001-OPERATIONAL-SCHEDULING.md
```
