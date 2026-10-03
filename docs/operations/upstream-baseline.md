# DeepSeek Harness source baseline

English | [中文](upstream-baseline.zh.md)

The [machine-readable pin](upstream-pin.json) records the official repository, exact source revision and toolchain used for this local implementation. The branch preserves the official Git history and the user-supplied design files.

The extension lives in [R&D packages](../../packages/rd/README.md), the client workbench and its additive bundle. It composes over the standard Web profile and reuses the existing agent loop, model settings and session persistence.

The lockfile retains the upstream dependency resolutions and adds the local package importers. The verified installation used the frozen lockfile and the local package cache. Optional desktop delivery is outside this pilot.

Use the [pilot guide](ai-rd-pilot.md) to build and run the workbench, and the [acceptance record](../acceptance/phase-1.md) to inspect evidence.
