import type { AssetKey } from './asset-manifest';
import type { WorldId } from '../types/game';

export interface Discovery {
  id: string;
  world: WorldId;
  /** Illustration shown in the discovery jar once found (silhouette before). */
  icon: AssetKey;
  /** Short description for screen readers and grown-ups. */
  label: string;
}

export const DISCOVERIES: readonly Discovery[] = [
  { id: 'town.drive', world: 'town', icon: 'car_red', label: 'A car drives along the road' },
  { id: 'town.night', world: 'town', icon: 'moon', label: 'Goodnight, little town' },
  { id: 'town.flower', world: 'town', icon: 'flower_red', label: 'A flower planted in a flower bed' },
  { id: 'town.nap', world: 'town', icon: 'cat_sleep', label: 'The cat naps on a bench' },
  { id: 'town.sit', world: 'town', icon: 'bench', label: 'Someone sits on a bench' },
  { id: 'town.treat', world: 'town', icon: 'treat_donut', label: 'The dog enjoys a treat' },
  { id: 'town.mail', world: 'town', icon: 'fx_letter', label: 'A letter is posted' },
  { id: 'town.redLight', world: 'town', icon: 'lamp_red', label: 'Cars wait at a red light' },
  { id: 'town.perch', world: 'town', icon: 'bird_up', label: 'A bird perches' },
  { id: 'town.icecream', world: 'town', icon: 'ice_cream_van', label: 'The ice cream van plays a tune' },

  { id: 'garden.plant', world: 'garden', icon: 'packet_tulip', label: 'Seeds planted in the soil' },
  { id: 'garden.water', world: 'garden', icon: 'watering_can', label: 'Watering helps plants grow' },
  { id: 'garden.bloom', world: 'garden', icon: 'plant_bloom_sun', label: 'A flower blooms' },
  { id: 'garden.rain', world: 'garden', icon: 'cloud_rain', label: 'A rain cloud' },
  { id: 'garden.rainbow', world: 'garden', icon: 'rainbow', label: 'Sunshine after rain makes a rainbow' },
  { id: 'garden.perch', world: 'garden', icon: 'bird_down', label: 'A bird perches in a tree' },
  { id: 'garden.butterfly', world: 'garden', icon: 'butterfly_pink', label: 'A butterfly visits a flower' },
  { id: 'garden.splash', world: 'garden', icon: 'pebble', label: 'Splash into the pond' },
  { id: 'garden.swim', world: 'garden', icon: 'duck', label: 'Swimming in the pond' },
  { id: 'garden.frog', world: 'garden', icon: 'frog', label: 'The frog sits on a lily pad' },
  { id: 'garden.carrot', world: 'garden', icon: 'carrot', label: 'The rabbit munches a carrot' },
  { id: 'garden.hedgehog', world: 'garden', icon: 'hedgehog_ball', label: 'The shy hedgehog curls up' },
  { id: 'garden.dig', world: 'garden', icon: 'shovel', label: 'Dig a new garden patch' },

  { id: 'workshop.draw', world: 'workshop', icon: 'icon_brush', label: 'Your first painting' },
  { id: 'workshop.crayon', world: 'workshop', icon: 'icon_crayon', label: 'Crayon scribbles' },
  { id: 'workshop.stamp', world: 'workshop', icon: 'icon_stamp', label: 'Stamp a shape' },
  { id: 'workshop.bucket', world: 'workshop', icon: 'icon_bucket', label: 'Paint the whole paper' },
  { id: 'workshop.sticker', world: 'workshop', icon: 'sticker_star', label: 'Stick a sticker' },
  { id: 'workshop.spin', world: 'workshop', icon: 'sticker_rocket', label: 'Turn and grow a sticker' },
  { id: 'workshop.color', world: 'workshop', icon: 'shape_circle', label: 'Change a paper shape colour' },
  { id: 'workshop.googly', world: 'workshop', icon: 'sticker_googly', label: 'Give a shape googly eyes' },
  { id: 'workshop.export', world: 'workshop', icon: 'icon_export', label: 'Save a picture' },

  { id: 'build.roll', world: 'build', icon: 'ramp', label: 'A ball rolls down a ramp' },
  { id: 'build.carRamp', world: 'build', icon: 'toy_car', label: 'A car zooms down a ramp' },
  { id: 'build.bell', world: 'build', icon: 'bell', label: 'Ring the bell' },
  { id: 'build.dominoes', world: 'build', icon: 'domino', label: 'Domino chain reaction' },
  { id: 'build.spring', world: 'build', icon: 'spring_pad', label: 'Boing on the spring' },
  { id: 'build.tower', world: 'build', icon: 'block_yellow', label: 'Build a tall tower' },
  { id: 'build.seesaw', world: 'build', icon: 'seesaw_plank', label: 'Tip the seesaw' },
  { id: 'build.pinwheel', world: 'build', icon: 'pinwheel', label: 'Spin the pinwheel' },
];

export const discoveriesFor = (world: WorldId) => DISCOVERIES.filter((d) => d.world === world);
export const DISCOVERY_IDS: ReadonlySet<string> = new Set(DISCOVERIES.map((d) => d.id));
