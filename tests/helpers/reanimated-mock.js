/**
 * Jest mock for `react-native-reanimated`.
 *
 * Reanimated 4 is built on `react-native-worklets`, whose native module cannot
 * be loaded inside Jest — the package's own mock pulls the native module in
 * through `./index`. This mock is self-contained instead: it implements the
 * exact slice of the Reanimated API the application uses, with animations
 * resolved immediately so components render synchronously and deterministically.
 *
 * API surface covered (verified against every import in `app/` and `src/`):
 *   Easing · FadeIn · FadeOut · Layout · SlideInLeft/Right · SlideOutLeft/Right
 *   ZoomIn · ZoomOut · interpolate · runOnJS · useAnimatedProps
 *   useAnimatedStyle · useDerivedValue · useSharedValue · withDelay
 *   withSpring · withTiming
 */

/* eslint-env node */
const React = require('react');
const { View, Text, ScrollView, Image } = require('react-native');

/** Props that only mean something to Reanimated and must not reach the view. */
const ANIMATION_PROPS = [
  'entering',
  'exiting',
  'layout',
  'sharedTransitionTag',
  'animation',
  'animatedProps',
];

function stripAnimationProps(props) {
  const out = {};
  for (const key of Object.keys(props || {})) {
    if (!ANIMATION_PROPS.includes(key)) out[key] = props[key];
  }
  return out;
}

const animatedComponent = (Component) => {
  const Wrapped = React.forwardRef((props, ref) =>
    React.createElement(Component, { ...stripAnimationProps(props), ref }),
  );
  Wrapped.displayName = `Animated(${
    Component.displayName || Component.name || 'Component'
  })`;
  return Wrapped;
};

const Animated = {
  View: animatedComponent(View),
  Text: animatedComponent(Text),
  ScrollView: animatedComponent(ScrollView),
  Image: animatedComponent(Image),
  createAnimatedComponent: animatedComponent,
};

/* --------------------------------------------------------------- easings */

const linear = (t) => t;

const Easing = {
  linear,
  ease: linear,
  in: linear,
  out: linear,
  inOut: linear,
  bezier: () => linear,
  bezierFn: () => linear,
  steps: () => linear,
  bezierFn: () => linear,
  cubic: (t) => t * t * t,
};

/* ------------------------------------------------------------- animations */

/**
 * An animation builder. Every configuration method returns the builder
 * itself, so `FadeIn.duration(200).easing(fn)` resolves to a plain object.
 */
function builder(name) {
  const api = {
    __name: name,
    duration() {
      return api;
    },
    easing() {
      return api;
    },
    delay() {
      return api;
    },
    springify() {
      return api;
    },
    damping() {
      return api;
    },
    stiffness() {
      return api;
    },
    mass() {
      return api;
    },
    withInitialValues() {
      return api;
    },
    withCallback() {
      return api;
    },
    build() {
      return api;
    },
  };
  return api;
}

/* ---------------------------------------------------------------- values */

/**
 * A faithful stand-in for Reanimated's `SharedValue`.
 *
 * Reanimated 4 exposes a `.value` property alongside the compiler-safe
 * `.get()` / `.set()` accessors. The application uses the accessors, so the
 * mock implements both against the same underlying cell.
 */
function createSharedValue(initial) {
  const cell = { value: initial };
  return {
    get value() {
      return cell.value;
    },
    set value(next) {
      cell.value = next;
    },
    get() {
      return cell.value;
    },
    set(next) {
      cell.value = typeof next === 'function' ? next(cell.value) : next;
    },
    addListener: () => {},
    removeListener: () => {},
    modify: () => {},
  };
}

const useSharedValue = (initial) => {
  const ref = React.useRef(null);
  if (ref.current === null) ref.current = createSharedValue(initial);
  return ref.current;
};

const useDerivedValue = (fn) => {
  const ref = React.useRef(null);
  if (ref.current === null) ref.current = createSharedValue(fn());
  return ref.current;
};

const useAnimatedStyle = (fn) => fn();
const useAnimatedProps = (fn) => fn();

const withTiming = (to) => to;
const withSpring = (to) => to;
const withDelay = (_delay, animation) =>
  typeof animation === 'function' ? animation() : animation;

const runOnJS = (fn) => fn;

/* ----------------------------------------------------------- interpolate */

const Extrapolation = {
  IDENTITY: 'identity',
  CLAMP: 'clamp',
  EXTEND: 'extend',
};

function interpolate(value, input, output, extrapolation) {
  if (!Array.isArray(input) || !Array.isArray(output) || input.length < 2) {
    return value;
  }
  const clamp = extrapolation === Extrapolation.CLAMP;
  let result = output[0];
  for (let i = 1; i < input.length; i += 1) {
    const [x0, x1] = [input[i - 1], input[i]];
    const [y0, y1] = [output[i - 1], output[i]];
    if (value >= x0 && value <= x1) {
      const t = x1 === x0 ? 0 : (value - x0) / (x1 - x0);
      result = y0 + t * (y1 - y0);
      break;
    }
    if (value > input[input.length - 1]) {
      result = output[output.length - 1];
    }
  }
  if (clamp) {
    const min = Math.min(...output);
    const max = Math.max(...output);
    return Math.min(max, Math.max(min, result));
  }
  return result;
}

module.exports = {
  __esModule: true,
  default: Animated,
  Animated,
  ...Animated,
  Easing,
  Extrapolation,
  FadeIn: builder('FadeIn'),
  FadeInDown: builder('FadeInDown'),
  FadeInUp: builder('FadeInUp'),
  FadeOut: builder('FadeOut'),
  FadeOutDown: builder('FadeOutDown'),
  FadeOutUp: builder('FadeOutUp'),
  Layout: builder('Layout'),
  SlideInLeft: builder('SlideInLeft'),
  SlideInRight: builder('SlideInRight'),
  SlideInUp: builder('SlideInUp'),
  SlideInDown: builder('SlideInDown'),
  SlideOutLeft: builder('SlideOutLeft'),
  SlideOutRight: builder('SlideOutRight'),
  SlideOutUp: builder('SlideOutUp'),
  SlideOutDown: builder('SlideOutDown'),
  ZoomIn: builder('ZoomIn'),
  ZoomOut: builder('ZoomOut'),
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
};
