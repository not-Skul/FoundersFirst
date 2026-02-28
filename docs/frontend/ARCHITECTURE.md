# Interactive Roadmap & Scheme Comparison - Architecture Guide

## Overview

This implementation provides a **flagship UX-focused feature** for Founders First that enables users to:

1. **Follow an interactive, AI-generated entrepreneurial roadmap** with phases, steps, and actionable guidance
2. **Compare government schemes side-by-side** to make informed decisions
3. **Track progress** throughout their entrepreneurial journey
4. **Discover related schemes** at each step of the roadmap

---

## Architecture

### Type System (`src/types/index.ts`)

Core types provide strong typing throughout the application:

#### Roadmap Types
- **`RoadmapPhase`**: Major phases (Ideation → Validation → Funding → Launch)
- **`RoadmapStep`**: Atomic tasks within phases with completion tracking
- **`RoadmapStatus`**: Four-state progression (not_started → in_progress → completed → paused)
- **`RoadmapSession`**: User's complete journey state

#### Scheme Types
- **`Scheme`**: Government scheme data (matches backend JSON structure)
- **`SchemeWithMetadata`**: Enhanced with UI state (selection, tags, relevance)
- **`SchemeComparisonState`**: Comparison UI state

#### Comparison Types
- **`SchemeComparisonAttribute`**: Comparable attributes with difference highlighting
- **`SavedComparison`**: Snapshot of saved comparisons with notes

---

## Component Architecture

### 1. Roadmap Components (`src/components/roadmap/`)

#### **RoadmapContainer**
Main orchestrator component that manages:
- Overall progress display (percentage)
- Current phase highlighting  
- Recommended next steps panel
- Timeline summary
- All phase expansion/collapse state

**Props:**
```typescript
interface RoadmapProps {
  phases: RoadmapPhase[];
  isLoading?: boolean;
  onStepComplete?: (stepId: string) => void;
  onStepSelect?: (stepId: string) => void;
  onSchemeSelect?: (scheme: Scheme) => void;
  userPhase?: number;
}
```

**Usage:**
```tsx
<RoadmapContainer
  phases={roadmapData}
  onStepComplete={handleStepComplete}
  userPhase={currentPhaseNumber}
/>
```

#### **RoadmapPhase**
Accordion-style phase component featuring:
- Phase number indicator with visual states (not started → in progress → completed)
- Progress bar showing step completion percentage
- Expandable content with smooth animations
- Current phase pulsing indicator
- Duration estimate

**Key Features:**
- Animated expand/collapse with Framer Motion
- Visual status indicators (circle → filled circle → checkmark)
- Gradient backgrounds for states
- Sticky collapse/expand icon

#### **RoadmapStep**
Individual step cards with:
- Timeline dot indicating status
- Step title, description, priority
- Related schemes display with relevance badges
- Resource links (guides, templates, tools)
- Mark complete button with animation
- Bookmark functionality

**Interactions:**
- Expandable to show full details
- Visual priority indicators
- Inline resource links with type badges
- One-click completion with confirmation animation

### 2. Scheme Comparison Components (`src/components/scheme-comparison/`)

#### **SchemeComparisonPanel**
Modal/dialog wrapper providing:
- Full-screen comparison experience
- View mode toggle (split ↔ table)
- Scheme swap functionality
- Save, share, export options
- Sticky header and footer

**Features:**
- Split view: Side-by-side card display
- Table view: Attribute-by-attribute comparison
- Highlighted differences (yellow background)
- CSV export capability
- Responsive sticky header/footer

#### **SchemeComparisonSplit**
Parallel column layout showing:
- Scheme headers with metadata badges
- Organized attributes by category
- Visual difference highlighting
- Key differences summary panel
- Easy-to-scan format

#### **SchemeComparisonTable**
Tabular view with:
- Attribute definitions in left column
- Scheme values side-by-side
- Color-coded scheme tags
- Category grouping
- Legend for interpretation

### 3. Scheme Components (`src/components/scheme/`)

#### **SchemeCard**
Versatile scheme display supporting three variants:

**Grid Variant (default)**
- Card-based layout for grid displays
- Metadata badges (ministry, sector, complexity)
- Funding and eligibility info
- Comparison checkbox integration
- Hover effects with gradient overlay
- Apply, compare, and bookmark actions

**List Variant**
- Horizontal layout for list views
- Minimal information hierarchy
- Quick action buttons
- Suitable for filtered results

**Compact Variant**
- Minimal form for embedding
- Title and external link only
- Lightweight selection

**Interactive Features:**
- Selection state management
- Comparison toggle (checkbox)
- Bookmark toggle with visual feedback
- External link to official source
- Tags with overflow handling

---

## State Management

### 1. SchemeComparisonContext

**Purpose:** Global state for managing scheme comparisons across the app

**API:**
```typescript
interface SchemeComparisonContextType {
  // State
  selectedSchemes: Scheme[];
  isComparisonOpen: boolean;
  
  // Actions
  addSchemeToComparison(scheme: Scheme): void;
  removeSchemeFromComparison(schemeId: string): void;
  swapSchemes(): void;
  clearComparison(): void;
  openComparison(): void;
  closeComparison(): void;
  
  // Saved comparisons
  savedComparisons: SavedComparison[];
  saveComparison(schemes: Scheme[], notes?: string): void;
  deleteSavedComparison(id: string): void;
}
```

**Usage in Components:**
```tsx
const { selectedSchemes, addSchemeToComparison } = useSchemeComparison();
```

**Limitations:** Max 2 schemes (enforced in context)

### 2. Local Component State

Components manage their own:
- Expanded/collapsed states (phases, steps)
- Hover states
- Bookmark toggles
- View mode preferences (split vs table)

---

## Utility Functions

### `src/lib/roadmap-utils.ts`

Key functions for roadmap operations:

- **`getStatusLabel(status)`** → Human-readable status text
- **`getStatusColor(status)`** → Tailwind color utilities
- **`getPhaseProgress(phase)`** → Progress percentage (0-100)
- **`getRoadmapProgress(phases)`** → Overall completion
- **`getCurrentPhase(phases)`** → Active phase
- **`getNextStep(phases)`** → Next incomplete step
- **`calculateTotalDuration(phases)`** → Total timeline estimate
- **`getRecommendedActions(phases)`** → Top 3 next actions
- **`getRelatedSchemes(steps)`** → Consolidated scheme list

### `src/lib/scheme-utils.ts`

Scheme comparison and display utilities:

- **`getSchemeAttributes(scheme)`** → Extractable attributes
- **`compareSchemes(s1, s2)`** → Difference highlighting
- **`getApplicationComplexity(scheme)`** → Complexity score
- **`enrichSchemeWithMetadata(scheme)`** → Add UI metadata
- **`extractTags(scheme)`** → Generate display tags
- **`calculateRelevanceScore(scheme, profile)`** → Relevance scoring
- **`filterSchemesByProfile(schemes, profile)`** → Smart filtering
- **`formatBenefitTag(tag)`** → Display formatting

---

## Animations & Micro-Interactions

### Framer Motion Usage

**Component-level animations:**
- Phases: Fade-in with top border accent
- Steps: Timeline dots fade/pulse based on status
- Cards: Hover lift, border glow
- Modals: Smooth appear/disappear with blur backdrop

**Status Progress:**
- Not Started: Static gray dot
- In Progress: Pulsing blue circle with scale animation
- Completed: Checkmark with spring bounce

**Expansion Animations:**
- Smooth height expand/collapse
- Staggered child animations
- Layout transitions for smooth repositioning

**Example:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
  {/* Content */}
</motion.div>
```

---

## Responsive Design Strategy

### Breakpoints
- **Mobile (< 768px):** Single column, stacked layouts
- **Tablet (768px - 1024px):** 2-column grid for schemes
- **Desktop (> 1024px):** 3-column grid, side panels

### Mobile Optimizations
- Roadmap: Full-width, sequential
- Comparison: Stacked split view → horizontal scroll table
- Scheme cards: Compact variant with essentials only
- Touch-friendly button sizes (8px padding minimum)

### Responsive Components
```tsx
// Roadmap: Full width on mobile, 5-column grid helpers visible on desktop
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {/* Progress cards */}
</div>

// Comparison: Stack on mobile, 2-column on desktop
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Split view */}
</div>

// Schemes: 1 col mobile, 2-3 col desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Scheme cards */}
</div>
```

---

## Integration Points

### AIBot Page
- Display roadmap using `RoadmapContainer`
- Convert AI-generated phases (old format) to new type system
- Show chat assistant alongside roadmap
- Trigger scheme comparison from roadmap steps
- Save progress to backend

### Schemes Page
- List all schemes with `SchemeCard` in grid mode
- Enable comparison checkbox per card
- Show comparison panel when 2 schemes selected
- Filter/sort by relevance to user profile

### Dashboard
- Quick progress overview of roadmap
- Next recommended steps widget
- Recent scheme comparisons
- Bookmark/saved resources

---

## UX Principles Applied

### 1. **Progressive Disclosure**
- Expand phases/steps on demand
- Hide complex details until needed
- Show summary information by default

### 2. **Visual Feedback**
- Clear status indicators (color, icons, animations)
- Hover states on all interactive elements
- Loading skeletons for async content
- Success animations after actions

### 3. **Accessibility**
- Semantic HTML (headings, labels, buttons)
- ARIA attributes where needed
- Keyboard navigation support
- Color + icon coding (not just color)

### 4. **Performance**
- Lazy render expanded content
- Memoized components where appropriate
- Optimistic updates (mark complete immediately)
- Efficient re-renders with React.memo

### 5. **Clarity**
- Consistent terminology across UI
- Clear action buttons with icons + text
- Helpful empty states
- Explanatory tooltips for complex features

---

## Data Flow Examples

### Completing a Step
```
User clicks "Mark Complete" button
  ↓
RoadmapStep.onComplete(stepId) called
  ↓
Component state updates (optimistic)
  ↓
API call sent to backend: PATCH /roadmap/steps/{stepId}
  ↓
Success: Animate checkmark, trigger confetti
  ↓
Error: Revert state, show toast notification
```

### Comparing Two Schemes
```
User clicks "Compare" on Scheme 1
  ↓
SchemeCard calls onCompare(scheme)
  ↓
useSchemeComparison.addSchemeToComparison(scheme)
  ↓
Context updates selectedSchemes [scheme1]
  ↓
User clicks "Compare" on Scheme 2
  ↓
addSchemeToComparison(scheme2)
  ↓
selectedSchemes = [scheme1, scheme2]
  ↓
ComparisonPanel opens automatically
  ↓
Attributes extracted and compared
  ↓
Differences highlighted
```

---

## Tailwind CSS Utilities Used

### Colors
- `bg-primary`, `bg-secondary` - Status indicators
- `text-foreground`, `text-muted-foreground` - Text hierarchy
- `border-primary/30` - Subtle accents
- `bg-gradient-to-*` - Gradients for depth

### Spacing
- `p-6` - Standard padding
- `gap-4` - Consistent gutters
- `rounded-2xl` - Generous border radius
- `py-4 px-6` - Asymmetric padding

### Responsive
- `hidden md:block` - Desktop only
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` - Responsive grids
- `max-w-5xl mx-auto` - Content constraints

### Interaction
- `hover:border-primary/30` - Hover feedback
- `transition-all` - Smooth state changes
- `cursor-pointer` - Interactive hint
- `group-hover:*` - Parent-driven hover effects

---

## Testing Strategy

### Unit Tests
- Utility functions (status color, progress calculation)
- Component prop validation
- Event handlers

### Integration Tests
- Phase expand/collapse workflow
- Scheme comparison flow
- Step completion with API calls

### E2E Tests
- Complete roadmap journey
- Comparison scenario end-to-end
- Mobile responsiveness

---

## Future Enhancements

1. **AI Integration**
   - Personalized scheme recommendations
   - Step difficulty prediction
   - Time-to-completion ML model

2. **Gamification**
   - Achievement badges
   - Milestone celebrations
   - Leaderboard (community context)

3. **Collaboration**
   - Share roadmaps with mentors
   - Peer comparisons
   - Collaborative notes

4. **Analytics**
   - Track user journey patterns
   - Scheme popularity metrics
   - Completion rate analysis

5. **Advanced Filtering**
   - Multi-criteria scheme filtering
   - Saved filter profiles
   - Smart recommendations

---

## File Structure

```
frontend/src/
├── components/
│   ├── roadmap/
│   │   ├── RoadmapContainer.tsx       # Main orchestrator
│   │   ├── RoadmapPhase.tsx            # Accordion phase
│   │   └── RoadmapStep.tsx             # Individual step
│   ├── scheme-comparison/
│   │   ├── SchemeComparisonPanel.tsx   # Modal wrapper
│   │   ├── SchemeComparisonSplit.tsx   # Split view
│   │   └── SchemeComparisonTable.tsx   # Table view
│   └── scheme/
│       └── SchemeCard.tsx              # Scheme display card
├── contexts/
│   └── SchemeComparisonContext.tsx     # Global comparison state
├── hooks/
│   └── useSchemeComparison.ts          # Comparison hook
├── lib/
│   ├── roadmap-utils.ts                # Roadmap helpers
│   └── scheme-utils.ts                 # Scheme helpers
├── types/
│   └── index.ts                        # TypeScript definitions
├── pages/
│   ├── AIBot.tsx                       # Enhanced with new components
│   └── Schemes.tsx                     # Enhanced with comparison
└── docs/
    └── INTEGRATION_GUIDE.md            # How to integrate
```

---

## Performance Considerations

### Bundle Size
- Components are tree-shakeable
- Lazy load comparison panel
- Minimal external dependencies (using existing shadcn/ui)

### Rendering
- Accordion pattern prevents rendering hidden steps
- AnimatePresence optimizes exit animations
- Memoization for stable prop references

### State Updates
- Optimistic updates for UX
- Minimal re-renders with granular state
- useCallback for stable event handlers

---

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome)
- No IE11 support (uses modern CSS Grid, Flexbox)

---

## Conclusion

This architecture provides:
✅ **Polished UX** - Animations, responsiveness, accessibility
✅ **Scalability** - Modular components, clear data flow
✅ **Type Safety** - Full TypeScript coverage
✅ **Maintainability** - Clear separation of concerns
✅ **Extensibility** - Easy to add new features

The system is production-ready and follows best practices comparable to Notion/Linear level polish.
