---
name: Mascotas QR Intelligent Care System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#b91a24'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff7a73'
  on-tertiary-container: '#79000e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies the "Modern Clean Care" philosophy: a synthesis of clinical veterinary precision, empathetic warmth, and life-critical technological reliability. The interface must balance two distinct emotional poles: reassurance during calm daily management (vaccinations, diet, biometric records) and intense clarity under stress (lost pet alerts, direct call dispatch, geo-location scanning).

The visual aesthetic combines clean, airy minimalism with subtle glassmorphic utility:
- **Surface Integrity:** Elevated containers rely on semi-transparent milky backdrops (`rgba(255, 255, 255, 0.75)` with `16px` backdrop blur) overlaid on neutral slate substrates.
- **Critical Urgency:** Emergency workflows shift context into high-legibility alert themes with pulsating indicator halos, ensuring immediate visual capture for finders scanning a QR code on a mobile device outdoors under bright sunlight.
- **Approachable Tech:** Friendly geometry, rounded silhouettes, and tactile pill containers create a calm, approachable experience for pet parents.

## Colors

The palette establishes an immediate sense of biological well-being, trust, and emergency responsiveness.

- **Primary & Health (`#10B981` Emerald 500 & `#0D9488` Teal 600):** Represents vitality, verified health records, up-to-date vaccinations, and system readiness. Emerald is reserved for principal actions, active identity indicators, and verified status markers. Teal anchors secondary interactive layers, tab navigation, and deep clinical data sets.
- **Canvas & Neutral Surfaces (`#F8FAFC` Slate 50 & `#FFFFFF` Pure White):** Creates high-contrast, clinical breathing room. Slate 50 acts as the canvas substrate, allowing white glassmorphic cards and floating sheets to delineate content hierarchically without harsh structural dividers.
- **Tech Base & Ink (`#0F172A` Slate 900 & `#1E293B` Slate 800):** Grounds the typography and technology touchpoints (QR scanners, code generations, telemetry). Primary headlines use Slate 900 for absolute contrast; Slate 600 (`#475569`) serves secondary descriptions and metadata.
- **Emergency & Missing Mode (`#EF4444` Red 500 & `#F59E0B` Amber 500):** High-priority state triggers. When a pet is marked missing, the interface replaces calm emerald tones with urgent red surfaces and amber alert warnings. Elements in this mode feature an ambient beacon pulse to immediately communicate life-saving actions to the finder.

## Typography

The typographic hierarchy pairs **Plus Jakarta Sans** for structural identity, display headers, metrics, and actionable labels with **Inter** for sustained technical and medical readability.

- **Plus Jakarta Sans:** Provides friendly geometry and modern terminal cuts, making pet names, health titles, and critical emergency headers instantly recognizable.
- **Inter:** Delivers high legibility for dense medical history, dosage instructions, microchip numbers, and step-by-step rescue guidelines.
- **Emergency Constraints:** In the lost/rescue view (`headline-xl-mobile` and `label-lg`), weight is boosted to `800` and `600` respectively, maximizing optical legibility in outdoor glare and stressful search conditions.

## Layout & Spacing

The layout is built on a responsive 8pt geometric grid with fluid alignment optimized for mobile-first scanning scenarios:

- **Mobile Viewports (< 768px):** 4-column layout with `1rem` margins and `1rem` gutters. Critical rescue buttons, call triggers, and pet status cards sit within thumb-accessible safe zones at the bottom of the viewport.
- **Tablet & Desktop (≥ 768px):** 12-column layout with `2.5rem` margins and `1.5rem` gutters. Medical records, multi-pet overviews, and telemetry maps distribute across dual-pane configurations: side navigation and pet selector on the left, data cards and QR administration on the right.
- **Rhythm & Gaps:** Component-level vertical stacks use `space-md` (`1rem`) for dense records and `space-lg` (`1.5rem`) for separating disparate medical sections. Micro-elements like chip badges and tag icons lock to `space-xs` and `space-sm`.

## Elevation & Depth

Visual depth is achieved through translucent layered surfaces and ambient environmental shadows:

- **Level 0 (Canvas):** Flat `#F8FAFC` base layer.
- **Level 1 (Subtle Glass Card):** Surface rendered with `rgba(255, 255, 255, 0.82)`, backdrop-filter `blur(12px)`, a `1px` inner stroke of `rgba(255, 255, 255, 0.6)`, and a diffuse ambient shadow: `0 4px 20px -2px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Interactive Floating Overlays & Sheets):** Surfaces with `rgba(255, 255, 255, 0.95)`, backdrop-filter `blur(16px)`, supported by `0 12px 32px -4px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Emergency Rescue Mode):** In an active alert state, cards gain an ambient outer glow: `0 0 0 4px rgba(239, 68, 68, 0.15), 0 8px 30px rgba(239, 68, 68, 0.25)`. High-urgency interactive elements feature a continuous `keyframes` soft pulse cycle.
- **Dark Elements (QR Terminals):** Slate 900 containers use an inner shadow of `inset 0 1px 0 rgba(255, 255, 255, 0.1)` combined with `0 20px 25px -5px rgba(15, 23, 42, 0.3)`.

## Shapes

The interface embraces organic, friendly curves that convey warmth while maintaining visual structure:

- **Cards & Data Modules:** Standardized to `rounded-2xl` (`1rem` / `16px`), softening technical data blocks and pet passport entries.
- **Badges, Chips & Action Triggers:** Standardized to full pill silhouettes (`9999px`) to create tactile, touch-friendly affordances.
- **QR Framing Units:** Retain an interior curvature of `12px` inside a `rounded-2xl` protective slate bezel, balancing geometric precision with approachable contours.

## Components

### Buttons
- **Primary Action (Health/Flow):** Solid `#10B981` background, white text, pill-shaped (`rounded-full`), height `48px`, font `label-lg`. On hover: `#0D9488` with slight vertical translate (`-1px`).
- **Emergency Rescue Button:** High-visibility `#EF4444` background with pure white text, pill-shaped, height `56px`, font `headline-sm`. Accompanied by a synchronized concentric pulse ring (`ring-4 ring-red-500/30 animate-pulse`) to direct finders toward immediate call or location dispatch.
- **Secondary / Ghost Button:** Translucent glass surface `rgba(255, 255, 255, 0.6)` with a `1px` border of `rgba(203, 213, 225, 0.8)`, text in `#0F172A`.

### Badges & Status Chips
- Full pill silhouettes (`rounded-full`) with `space-xs` vertical and `space-sm` horizontal padding.
- **Vaccinated / Healthy:** Emerald tint (`bg-emerald-500/10 text-emerald-700 border border-emerald-500/20`).
- **Lost / Critical Alert:** Red tint (`bg-red-500/10 text-red-600 border border-red-500/30`) containing a `6px` pulsating red dot.
- **Microchip / Tag ID:** Tech badge with Slate 900 background, Slate 100 monospaced text, and subtle teal indicator dot.

### Cards (Pet Passport & Medical Module)
- Styled with `rounded-2xl`, glassmorphic white surfaces (`bg-white/80 backdrop-blur-md`), bordered by a subtle `1px` border of `rgba(226, 232, 240, 0.8)`.
- Internal structure divides identity (avatar, breed, name, age) from clinical telemetry (allergies, contact phone, vet address) using lightweight `1px` divider lines in `#F1F5F9`.

### QR Code Hero Display
- High-contrast module enclosed in a dark Slate 900 container to ensure reliable scanning under any ambient light.
- Features a center-aligned pet avatar anchor and an instant-share action cluster positioned directly underneath.

### Input Fields & Search
- Inputs use `#FFFFFF` fill with `1px` border of `#CBD5E1`, curved to `rounded-xl`, height `48px`, text in `#0F172A`.
- Active/focused state: `border-emerald-500 ring-2 ring-emerald-500/20` transition.

### Checkboxes & Radios
- Rounded `6px` (checkboxes) and full circle (radios), sized `20px x 20px`.
- Unchecked: `#E2E8F0` border on white background. Checked: `#10B981` fill with crisp white check/circle glyph.