---
name: ui-brand
description: Guide Claude to operate as a top 0.001% UI and Brand designer, working hand-in-hand with UX Design Skill to create visually stunning, cohesive, and emotionally resonant design systems that strengthen brand identity while maintaining exceptional usability.
---

# UI + Brand Design Skill

## Overview

This skill guides Claude to operate as a top 0.001% UI and Brand designer, working hand-in-hand with UX Design Skill to create visually stunning, cohesive, and emotionally resonant design systems that strengthen brand identity while maintaining exceptional usability.

## Relationship to UX Design Skill

This skill **extends** the UX Design Skill by adding:

- Visual brand identity and personality
- Sophisticated color theory and palettes
- Advanced typography and typographic hierarchy
- Motion design and animation principles
- Iconography and illustration systems
- Visual storytelling and emotional design
- Brand consistency across touchpoints

**Critical**: Never sacrifice UX principles (accessibility, usability, clarity) for visual appeal. UI and Brand design should **enhance** UX, not compromise it.

## Core Principles

### 1. Brand Identity Foundation

#### Brand Personality Dimensions

Every brand exists on these spectrums:

```
Playful ←→ Serious
Minimal ←→ Ornate
Modern ←→ Classic
Warm ←→ Cool
Bold ←→ Subtle
Friendly ←→ Professional
Innovative ←→ Trustworthy
```

#### Visual Voice

The visual design must speak the same language as the brand:

- **Luxury**: Generous white space, refined typography, subtle animations, premium materials
- **Energetic**: Bold colors, dynamic shapes, bouncy animations, high contrast
- **Trustworthy**: Conservative colors (navy, gray), clear hierarchy, steady animations
- **Innovative**: Asymmetric layouts, gradient colors, experimental typography, fluid animations
- **Friendly**: Rounded corners, warm colors, gentle animations, approachable typography

### 2. Advanced Color Theory

#### Color Psychology

```
Red: Energy, urgency, passion, danger
Orange: Creativity, enthusiasm, warmth
Yellow: Optimism, clarity, attention
Green: Growth, health, harmony, success
Blue: Trust, calm, stability, professionalism
Purple: Luxury, creativity, wisdom
Pink: Compassion, playfulness, modern
Black: Power, elegance, sophistication
White: Purity, simplicity, space
Gray: Balance, neutrality, timelessness
```

#### Color Palette Architecture

```typescript
// Extended palette structure
export const brandColors = {
	// Core brand colors
	primary: {
		50: '#eff6ff', // Lightest tint
		100: '#dbeafe',
		200: '#bfdbfe',
		300: '#93c5fd',
		400: '#60a5fa',
		500: '#3b82f6', // Base color
		600: '#2563eb',
		700: '#1d4ed8',
		800: '#1e40af',
		900: '#1e3a8a', // Darkest shade
		950: '#172554' // Extra dark for text on light
	},

	// Supporting brand color
	secondary: {
		// Same structure...
	},

	// Accent colors (1-2 max)
	accent: {
		// For highlights, special elements
	},

	// Semantic colors (inherit from brand or custom)
	success: {
		/* green shades */
	},
	warning: {
		/* amber/orange shades */
	},
	error: {
		/* red shades */
	},
	info: {
		/* blue shades */
	},

	// Neutrals (8-10 shades minimum)
	gray: {
		50: '#f9fafb',
		100: '#f3f4f6',
		200: '#e5e7eb',
		300: '#d1d5db',
		400: '#9ca3af',
		500: '#6b7280', // Mid-point for borders
		600: '#4b5563',
		700: '#374151',
		800: '#1f2937',
		900: '#111827', // Text on light backgrounds
		950: '#030712' // Deepest black
	}
};
```

#### Color Harmony Rules

- **Monochromatic**: Single hue, multiple tints/shades (elegant, cohesive)
- **Analogous**: Adjacent colors on wheel (harmonious, natural)
- **Complementary**: Opposite colors (vibrant, energetic)
- **Triadic**: Three colors equally spaced (balanced, vibrant)
- **Split-Complementary**: Base + two adjacent to complement (sophisticated)

#### Color Application Strategy

```
60% - Dominant (usually neutral background)
30% - Secondary (brand color, content areas)
10% - Accent (CTAs, highlights, important elements)
```

### 3. Typography as Brand Voice

#### Typeface Selection Strategy

```
Display/Headline Font: Brand personality carrier
- Serif: Traditional, trustworthy, editorial
- Sans-serif: Modern, clean, tech-forward
- Slab serif: Bold, confident, impactful
- Script: Elegant, personal, creative
- Geometric: Modern, precise, tech

Body Font: Readability first
- High x-height for better legibility
- Open counters (interior spaces)
- Distinct character shapes (1 vs l vs I)
- Well-designed bold and italic variants
```

#### Font Pairing Principles

1. **Contrast**: Combine serif + sans-serif, or geometric + humanist
2. **Mood alignment**: Both fonts should support brand personality
3. **Weight variety**: Ensure both fonts have needed weights (400, 500, 600, 700)
4. **Limited palette**: 2-3 typefaces maximum (1 display, 1 body, optionally 1 monospace)

#### Typographic Scale (Modular Scale)

```typescript
// Example: 1.250 (Major Third) scale
export const typography = {
	// Display sizes (headlines, heroes)
	display: {
		xl: '4.5rem', // 72px - Hero headlines
		lg: '3.75rem', // 60px - Page headlines
		md: '3rem', // 48px - Section headlines
		sm: '2.25rem' // 36px - Subsection headlines
	},

	// Heading sizes (content hierarchy)
	heading: {
		h1: '2.25rem', // 36px
		h2: '1.875rem', // 30px
		h3: '1.5rem', // 24px
		h4: '1.25rem', // 20px
		h5: '1.125rem', // 18px
		h6: '1rem' // 16px
	},

	// Body sizes
	body: {
		xl: '1.25rem', // 20px - Large body, intro paragraphs
		lg: '1.125rem', // 18px - Comfortable reading
		md: '1rem', // 16px - Default body text
		sm: '0.875rem', // 14px - Secondary text, captions
		xs: '0.75rem' // 12px - Fine print, labels
	}
};
```

#### Advanced Typography Details

- **Letter spacing**: Headlines (-0.02em to -0.04em), All caps (+0.05em to +0.1em)
- **Line height**: Display (1.1-1.2), Headings (1.2-1.3), Body (1.5-1.6), Small text (1.4)
- **Font features**: Enable ligatures, old-style numerals for body text, tabular for tables
- **Responsive typography**: Fluid scaling with clamp() for smooth size transitions

### 4. Spacing & Rhythm System

#### Spatial Hierarchy

```typescript
export const space = {
	// Micro spacing (within components)
	px: '1px',
	0.5: '2px',
	1: '4px',
	1.5: '6px',
	2: '8px',
	2.5: '10px',
	3: '12px',
	3.5: '14px',
	4: '16px',
	5: '20px',
	6: '24px',

	// Macro spacing (between sections)
	8: '32px',
	10: '40px',
	12: '48px',
	16: '64px',
	20: '80px',
	24: '96px',
	32: '128px',
	40: '160px',
	48: '192px',
	64: '256px'
};
```

#### Golden Ratio in Layout

- Use 1.618 ratio for asymmetric but balanced layouts
- Sidebar to content: 1:1.618 or 1:2.618
- Image to text areas: 1.618:1 for visual emphasis

### 5. Visual Elements & Elevation

#### Shadow System (Material Elevation)

```css
/* Subtle elevation for cards, buttons */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Default cards, dropdowns */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Elevated elements, popovers */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* Modals, overlays */
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* Maximum elevation */
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

#### Border Radius Philosophy

```typescript
export const radius = {
	none: '0',
	sm: '0.25rem', // 4px - Subtle rounding
	md: '0.5rem', // 8px - Default for most elements
	lg: '0.75rem', // 12px - Cards, containers
	xl: '1rem', // 16px - Prominent elements
	'2xl': '1.5rem', // 24px - Hero elements
	'3xl': '2rem', // 32px - Extra large
	full: '9999px' // Pills, circular elements
};
```

**Radius Strategy**:

- Consistent radius family across brand
- Larger elements get larger radius (proportional)
- Sharp corners (0px) for technical/serious brands
- Heavily rounded for friendly/modern brands

#### Glassmorphism & Depth

```css
.glass-effect {
	background: rgba(255, 255, 255, 0.1);
	backdrop-filter: blur(10px);
	border: 1px solid rgba(255, 255, 255, 0.2);
}

.neumorphism {
	background: #e0e0e0;
	box-shadow:
		20px 20px 60px #bebebe,
		-20px -20px 60px #ffffff;
}
```

### 6. Iconography System

#### Icon Design Principles

- **Consistent stroke weight**: 1.5px or 2px throughout
- **Consistent corner radius**: Match brand's border-radius
- **Optical sizing**: Adjust visually for perceived balance
- **Grid system**: 24×24px base, align to pixel grid
- **Style consistency**: Outline OR filled, not mixed

#### Icon Families

```
System icons: Navigation, actions (outline style)
Product icons: Features, services (filled or duotone)
Decorative icons: Illustrations, embellishments
```

#### Icon-Text Relationships

- Baseline alignment with text
- 0.25-0.5em spacing from text
- Size: 1-1.5× text height
- Color: Match text or slightly muted

### 7. Motion Design & Animation

#### Animation Timing Functions

```typescript
export const easing = {
	// Natural motion (most common)
	easeOut: 'cubic-bezier(0.33, 1, 0.68, 1)', // Decelerating
	easeIn: 'cubic-bezier(0.32, 0, 0.67, 0)', // Accelerating
	easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)', // Both

	// Playful/bouncy (friendly brands)
	bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

	// Sharp/technical (professional brands)
	sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',

	// Elastic (attention-grabbing)
	elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)'
};
```

#### Duration Guidelines

```typescript
export const duration = {
	instant: '50ms', // Color changes, opacity
	fast: '100ms', // Hover states
	normal: '200ms', // Most transitions
	slow: '300ms', // Large movements, modals
	slower: '500ms', // Page transitions
	slowest: '1000ms' // Hero animations, onboarding
};
```

#### Animation Principles (Disney's 12 Principles adapted)

1. **Squash and stretch**: Buttons slightly scale on press
2. **Anticipation**: Slight move before main action
3. **Follow through**: Overshoot then settle
4. **Ease in/out**: Natural acceleration/deceleration
5. **Staging**: Direct attention with motion
6. **Timing**: Faster = lighter, slower = heavier

#### Motion Patterns

```typescript
// Micro-interactions
const buttonPress = {
	transform: 'scale(0.98)',
	transition: 'transform 100ms ease-out'
};

// Enter animations
const fadeInUp = {
	from: { opacity: 0, transform: 'translateY(20px)' },
	to: { opacity: 1, transform: 'translateY(0)' },
	duration: '400ms',
	easing: 'ease-out'
};

// Page transitions
const slideIn = {
	from: { transform: 'translateX(100%)' },
	to: { transform: 'translateX(0)' },
	duration: '300ms',
	easing: 'cubic-bezier(0.33, 1, 0.68, 1)'
};
```

#### Respect User Preferences

```css
@media (prefers-reduced-motion: reduce) {
	* {
		animation-duration: 0.01ms !important;
		transition-duration: 0.01ms !important;
	}
}
```

### 8. Image & Illustration Strategy

#### Photography Style

- **Authentic**: Real people, genuine moments vs stock feel
- **Color treatment**: Filters, overlays that match brand palette
- **Composition**: Rule of thirds, leading lines, negative space
- **Aspect ratios**: 16:9 (standard), 4:3 (traditional), 1:1 (social), 2:3 (portrait)

#### Illustration Style Spectrum

```
Flat ←→ Dimensional
Geometric ←→ Organic
Minimal ←→ Detailed
Abstract ←→ Realistic
Playful ←→ Professional
```

#### Image Optimization

- Use WebP/AVIF with JPEG fallback
- Lazy load below fold
- Blur-up or dominant color placeholder
- Responsive images with srcset
- Compress to <100KB for heroes, <50KB for content

### 9. Component-Level Brand Expression

#### Buttons

```typescript
// Primary button variants by brand personality

// Bold/Energetic brand
const boldButton = {
	background: 'linear-gradient(135deg, primary-500, primary-600)',
	transform: 'hover:scale(1.05)',
	boxShadow: '0 4px 14px rgba(primary, 0.4)',
	fontWeight: '700'
};

// Minimal/Elegant brand
const minimalButton = {
	background: 'white',
	border: '1px solid gray-900',
	color: 'gray-900',
	transform: 'hover:translate-y(-2px)',
	transition: 'all 200ms ease-out'
};

// Friendly/Approachable brand
const friendlyButton = {
	background: 'primary-500',
	borderRadius: '9999px', // Pill shape
	padding: '12px 32px',
	boxShadow: '0 2px 8px rgba(primary, 0.25)'
};
```

#### Cards

```typescript
// Card treatments by brand

// Tech/Modern
const modernCard = {
	background: 'white',
	border: '1px solid gray-200',
	borderRadius: '12px',
	boxShadow: 'none',
	hover: {
		borderColor: 'primary-500',
		transform: 'translateY(-4px)',
		boxShadow: 'shadow-lg'
	}
};

// Premium/Luxury
const luxuryCard = {
	background: 'gradient-to-br from-gray-50 to-white',
	border: 'none',
	borderRadius: '8px',
	boxShadow: 'shadow-2xl',
	padding: '48px'
};
```

### 10. Dark Mode Strategy

#### Semantic Color Mapping

```typescript
// Light mode
const light = {
	bg: {
		primary: 'white',
		secondary: 'gray-50',
		tertiary: 'gray-100'
	},
	text: {
		primary: 'gray-900',
		secondary: 'gray-600',
		tertiary: 'gray-500'
	},
	border: 'gray-200'
};

// Dark mode (NOT just inverted!)
const dark = {
	bg: {
		primary: 'gray-900', // Not pure black
		secondary: 'gray-850', // Slight variation
		tertiary: 'gray-800'
	},
	text: {
		primary: 'gray-100', // Not pure white (easier on eyes)
		secondary: 'gray-400',
		tertiary: 'gray-500'
	},
	border: 'gray-700' // Subtle borders
};
```

#### Dark Mode Best Practices

- Reduce pure white (use gray-100 instead) to reduce eye strain
- Increase elevation with lighter surfaces, not just shadows
- Desaturate bright colors slightly in dark mode
- Use colored shadows for depth (e.g., blue shadow on blue elements)
- Maintain contrast ratios (test with tools)

### 11. Responsive Brand Consistency

#### Logo Adaptations

```
Full logo: Desktop, ample space
Logomark only: Mobile, small spaces
Horizontal: Wide containers
Stacked: Narrow containers, social media
Monochrome: Single-color applications
```

#### Breakpoint-Specific Adjustments

```
Mobile (< 768px):
- Larger touch targets (44×44px)
- Simplified navigation
- Stacked layouts
- Reduced animation complexity

Tablet (768px - 1024px):
- Hybrid layouts
- Optimized for both touch and mouse
- Flexible grid systems

Desktop (> 1024px):
- Multi-column layouts
- Hover states
- More sophisticated animations
- Full feature set
```

### 12. Accessibility in Brand Design

#### Color Contrast Requirements

```
WCAG AA (Minimum):
- Normal text (< 18px): 4.5:1
- Large text (≥ 18px): 3:1
- UI components: 3:1

WCAG AAA (Enhanced):
- Normal text: 7:1
- Large text: 4.5:1
```

#### Accessible Color Combinations

```typescript
// Always test with contrast checker
const accessiblePairs = {
	// Text on backgrounds
	'gray-900 on white': '20.8:1', // Excellent
	'gray-700 on white': '11.4:1', // Excellent
	'primary-600 on white': '7.1:1', // AAA
	'primary-500 on white': '4.8:1', // AA (minimum)

	// Interactive elements
	'primary-600 on gray-100': '6.2:1' // Good for buttons
};
```

#### Beyond Color

- Don't rely on color alone (use icons, text, patterns)
- Ensure focus indicators are visible (3px outline, 3:1 contrast)
- Animated content: provide pause/play controls
- Sufficient size for interactive elements

### 13. Design System Documentation

#### Component Documentation Template

```markdown
## Button Component

### Purpose

Primary call-to-action for user interactions

### Variants

- Primary: Main actions (Sign up, Submit)
- Secondary: Supporting actions (Cancel, Back)
- Tertiary: Low-priority actions (Learn more)
- Destructive: Dangerous actions (Delete, Remove)

### Sizes

- sm: 32px height, 12px 16px padding
- md: 40px height, 12px 24px padding
- lg: 48px height, 16px 32px padding

### States

- Default, Hover, Active, Focus, Disabled, Loading

### Usage Guidelines

DO: Use primary for one main action per screen
DON'T: Use multiple primary buttons in same context

### Code Example

[Svelte component code]

### Accessibility

- Minimum 44×44px touch target
- Clear focus indicator
- Loading state announced to screen readers
```

### 14. Brand Application Checklist

When implementing brand design:

**Visual Consistency**

- [ ] Color palette applied correctly
- [ ] Typography scale maintained
- [ ] Spacing system used throughout
- [ ] Border radius consistent
- [ ] Shadow system applied appropriately
- [ ] Icons from same family

**Brand Voice**

- [ ] Visual elements reflect brand personality
- [ ] Tone matches across touchpoints
- [ ] Emotional response appropriate
- [ ] Differentiation from competitors clear

**Motion & Interaction**

- [ ] Animation timing consistent
- [ ] Easing functions brand-appropriate
- [ ] Respects prefers-reduced-motion
- [ ] Micro-interactions polished
- [ ] Loading states branded

**Responsive & Adaptive**

- [ ] Logo scales appropriately
- [ ] Color contrast maintained at all sizes
- [ ] Touch targets adequate on mobile
- [ ] Content hierarchy clear on all screens
- [ ] Dark mode considered and implemented

**Accessibility**

- [ ] Color contrast meets WCAG AA minimum
- [ ] Focus states visible and on-brand
- [ ] Not relying on color alone
- [ ] Text readable at all sizes
- [ ] Motion respects user preferences

## Common Brand Archetypes & Visual Translations

### The Innovator (Tech, Startups)

```
Colors: Blue/purple gradients, electric accents
Typography: Geometric sans-serif (Inter, Satoshi)
Spacing: Generous, breathing room
Borders: Subtle, 8-12px radius
Shadows: Colored, glowing effects
Animation: Smooth, fluid, slightly bouncy
```

### The Authority (Finance, Legal, Enterprise)

```
Colors: Navy, gray, minimal accent
Typography: Classic serif (Tiempos) + clean sans (Suisse)
Spacing: Structured, grid-based
Borders: Sharp corners or minimal radius
Shadows: Subtle, realistic
Animation: Minimal, purposeful, smooth
```

### The Creator (Design, Art, Agency)

```
Colors: Bold, unexpected combinations
Typography: Display fonts, artistic choices
Spacing: Asymmetric, dynamic
Borders: Varied, experimental
Shadows: Dramatic or absent
Animation: Playful, attention-grabbing
```

### The Caregiver (Health, Education, Non-profit)

```
Colors: Warm, approachable (greens, soft blues)
Typography: Humanist sans (Open Sans, Nunito)
Spacing: Comfortable, not cramped
Borders: Rounded (12-16px)
Shadows: Soft, welcoming
Animation: Gentle, reassuring
```

## Integration with UX Design Skill

### Workflow

1. **Start with UX** - Information architecture, user flows, wireframes
2. **Add Brand Layer** - Apply visual identity while maintaining UX
3. **Refine Together** - Ensure brand enhances rather than hinders UX
4. **Test Both** - Usability AND brand perception
5. **Document** - Create living style guide

### Decision Framework

```
When UX and Brand conflict:

Question 1: Is the brand element essential to identity?
Question 2: Does it compromise core usability?

If Yes to 1, No to 2: Keep brand element
If Yes to both: Redesign to solve both needs
If No to 1: Prioritize UX
```

### Never Compromise On

- Accessibility (contrast, size, clarity)
- Core usability (navigation, forms, CTAs)
- Performance (animation shouldn't block interaction)
- Clarity (aesthetic shouldn't obscure meaning)

### Brand Can Enhance

- Emotional connection
- Memorability
- Trust and credibility
- Differentiation
- Perceived value
- User delight

## Output Expectations

When Claude creates UI/Brand work using this skill:

- Visual design is intentional and defensible
- Brand personality is consistent throughout
- Typography, color, spacing follow defined systems
- Animations enhance, never distract
- Design scales beautifully across breakpoints
- Accessibility is never sacrificed for aesthetics
- Code is organized with design tokens
- Documentation explains design decisions
- Works seamlessly with UX Design Skill principles

## Tools & Resources Reference

- **Color**: Coolors.co, Adobe Color, Paletton
- **Typography**: Typescale.com, Fontpair.co, Google Fonts
- **Contrast**: WebAIM Contrast Checker, Stark
- **Icons**: Lucide, Heroicons, Phosphor, Feather
- **Animation**: Cubic-bezier.com, Easings.net
- **Inspiration**: Dribbble, Behance, Awwwards, SiteInspire
