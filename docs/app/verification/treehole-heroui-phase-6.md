# Treehole HeroUI Native Phase 6 verification

Date: 2026-10-16

Scope: Phase 6 of `App树洞HeroUI-Native重构设计与实施计划.md`.

## Code and automated checks

| Area | Evidence | Result |
|---|---|---|
| Post data projection and continuous feed | `p2x-treehole-post*.test*`, `p2x-bing-campus.test.tsx` | Passed |
| Static feed and detail media modes | `p2x-treehole-media.test.tsx` | Passed |
| Search, report, replies and anonymous boundary | `p2x-bing-campus*.test*`, `p3y5-review-replies.test.tsx` | Passed |
| Type safety | `npm run typecheck` | Passed |
| Lint | `npm run lint` | Passed with 98 existing warnings and 0 errors |

The treehole-focused Jest run used `--runInBand`: the parallel run exhausted the local JavaScript worker heap, while
the same 7 suites passed serially with 106 tests. This is an environment resource limitation, not a failing assertion.

## Deferred runtime evidence

The user explicitly decided that this period skips all local runtime testing. Therefore none of the items below is
claimed as passed or failed:

- Android/iOS build, installation, and device launch.
- Light/dark visual review, 200% system font interaction, TalkBack or VoiceOver focus order.
- Keyboard and HeroUI BottomSheet focus behaviour.
- Gesture feel, reduced-motion rendering, image error recovery, FlashList scrolling frame time, and memory use.

Earlier Android build failures remain historical evidence only. They are not retried in this period under the updated
testing decision.

## Static implementation coverage

- `TreeholePost` is the shared list/detail post surface; the feed is divider-based and supports normal-size expansion.
- `TreeholeMedia` isolates a static feed preview from detail-only controls, uses Expo Image cache policy, and resets its
  index when the post or image sequence changes.
- Detail swipes use the documented 60 dp / 700 dp/s threshold and use a Reanimated reduced-motion branch.
- `TreeholeSearchEntry`, `TreeholePostMenu`, `TreeholeReport`, and `TreeholeCommentThread` retain the existing search,
  report, reply, and API state owners.
- Feed and discussion accessibility labels are localized; runtime screen-reader validation remains deferred.
