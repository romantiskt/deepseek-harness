---
description: 'Choose the owners for R&D command validation, durable workflow state and scoped Harness execution.'
kind: 'package-group'
---

# rd/ — AI-native R&D

English | [中文](README.zh.md)

## Summary

This family connects conversational requirements to version reviews, selected-checkout development, testing and delivery records. The workflow service owns business decisions; the runtime owns scoped Harness execution. The client and bundle compose those capabilities into a local workbench.

## Table of Contents

- [Packages](#packages)
- [Related documentation](#related-documentation)
- [Dev Note](#dev-note)

---

<a id="packages"></a>

## Packages

Choose the owner for the behavior you are changing.

| Package                          | Role                                                 |
| -------------------------------- | ---------------------------------------------------- |
| [contracts](contracts/README.md) | Public records and command validation.               |
| [workflow](workflow/README.md)   | Authenticated durable business transitions.          |
| [runtime](runtime/README.md)     | Scoped AI sessions and selected workspace execution. |

<a id="related-documentation"></a>

## Related documentation

- [Client](../client/rd-workbench/README.md) — workbench controls.
- [Bundle](../bundle/rd-workbench/README.md) — local profile composition.
- [Pilot guide](../../docs/operations/ai-rd-pilot.md) — startup and operation.

<a id="dev-note"></a>

## Dev Note

None.
