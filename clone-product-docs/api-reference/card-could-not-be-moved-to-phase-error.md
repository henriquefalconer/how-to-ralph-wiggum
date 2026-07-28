# Receiving Card could not be moved to phase

### Example Error

```json
{
  "data": {
    "moveCardToPhase": null
  },
  "errors": [
    {
      "message": "Card could not be moved to phase id: 316983122",
      "locations": [ ... ],
      "path": [ ... ]
    }
  ]
}
```

## Why This Happens

This error occurs when Pipefy cannot move a card to the specified phase.

### Common Causes

1. **Invalid Phase Transition:**
   1. The destination phase is not directly reachable from the card’s current phase (e.g., due to phase **Move card settings**).
   2. The destination phase belongs to a different pipe.
2. **Missing Mandatory Fields:**
   1. The destination phase has **required fields** (e.g., a dropdown, email, or attachment field) that are empty or invalid on the card.

### How to Fix It

1. **Check Move card settings**
   1. In the Pipefy UI, verify whether the destination phase is directly reachable from the card’s current phase. In the Pipefy UI (hover over the phase title -> click on the three dots \[more options] -> Move card settings).
2. **Fill Mandatory Fields**
   1. In the Pipefy UI or through API, check the card for fields marked as Required.