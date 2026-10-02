import { MoAAsset } from './types';

export const MOA_ASSETS: MoAAsset[] = [
  {
    id: 'bloodstream',
    name: 'Кровоток и эритроциты',
    category: 'cardio',
    description: 'Макро-съемка движения эритроцитов по сосудам, обогащение кислородом и эластичность стенок',
    scientificConcept: 'Транспорт нутриентов, снижение вязкости крови и холестериновых бляшек',
    associatedNutrients: ['Омега-3', 'Железо', 'Витамин D3', 'Витамин E', 'Коэнзим Q10'],
    gradientBg: 'from-rose-950 via-red-900 to-black',
    accentColor: '#EF4444',
    iconName: 'HeartPulse',
    fallbackPosterUrl: '/assets/video-studio/bloodstream.webp'
  },
  {
    id: 'neurons',
    name: 'Нейроны мозга и синапсы',
    category: 'brain',
    description: 'Вспышки нейронных связей, прохождение электрических импульсов и активация ГАМК-рецепторов',
    scientificConcept: 'Снижение нейро-воспаления, регуляция кортизола, повышение концентрации и глубокий сон',
    associatedNutrients: ['Магний В6', 'Глицин', 'L-Теанин', 'Витамины группы B', 'Ежовик гребенчатый'],
    gradientBg: 'from-indigo-950 via-purple-900 to-black',
    accentColor: '#8B5CF6',
    iconName: 'Brain',
    fallbackPosterUrl: '/assets/video-studio/neurons.webp'
  },
  {
    id: 'collagen_dermis',
    name: 'Коллагеновая сетка дермы',
    category: 'dermis',
    description: '3D структура волокон коллагена и эластина, уплотнение фибробластов и увлажнение матрикса',
    scientificConcept: 'Синтез нативного коллагена I и III типа, разглаживание заломов и тургор кожи',
    associatedNutrients: ['Морской коллаген', 'Витамин C', 'Биотин', 'Гиалуроновая кислота', 'Цинк'],
    gradientBg: 'from-amber-950 via-orange-900 to-black',
    accentColor: '#F59E0B',
    iconName: 'Sparkles',
    fallbackPosterUrl: '/assets/video-studio/collagen.webp'
  },
  {
    id: 'capsule_dissolve',
    name: 'Растворение капсулы и ЖКТ',
    category: 'digestion',
    description: 'Растворение вегетарианской капсулы в желудке, высвобождение микрокапсул и всасывание в кишечнике',
    scientificConcept: 'Липосомальная защита от соляной кислоты желудка, доставка 94% активных веществ в кровь',
    associatedNutrients: ['Все капсульные витамины', 'Пробиотики', 'Энзимы', 'Липосомальные формулы'],
    gradientBg: 'from-emerald-950 via-teal-900 to-black',
    accentColor: '#10B981',
    iconName: 'Pill',
    fallbackPosterUrl: '/assets/video-studio/capsule.webp'
  },
  {
    id: 'mitochondria',
    name: 'Митохондрия и синтез АТФ',
    category: 'cellular',
    description: 'Клеточная электростанция, вращение АТФ-синтазы и мощный выброс клеточной энергии',
    scientificConcept: 'Преодоление клеточного голодания, ликвидация синдрома хронической усталости',
    associatedNutrients: ['Коэнзим Q10', 'Магний малат', 'Альфа-липоевая кислота', 'PQQ', 'Витамин B12'],
    gradientBg: 'from-cyan-950 via-blue-900 to-black',
    accentColor: '#06B6D4',
    iconName: 'Zap',
    fallbackPosterUrl: '/assets/video-studio/mitochondria.webp'
  },
  {
    id: 'joint_cartilage',
    name: 'Суставной хрящ и синовия',
    category: 'joints',
    description: 'Амортизация хрящевой ткани, выработка синовиальной жидкости и снятие воспалительного отека',
    scientificConcept: 'Регенерация хондроцитов, восстановление скольжения и устранение утренней скованности',
    associatedNutrients: ['Глюкозамин', 'Хондроитин', 'МСМ (Сера)', 'Куркумин', 'Босвеллия'],
    gradientBg: 'from-sky-950 via-indigo-900 to-black',
    accentColor: '#38BDF8',
    iconName: 'Activity',
    fallbackPosterUrl: '/assets/video-studio/cartilage.webp'
  },
  {
    id: 'immunity_cells',
    name: 'Иммунные клетки и защита',
    category: 'immunity',
    description: 'Макрофаги и Т-лимфоциты нейтрализуют патогены, создание барьерного клеточного щита',
    scientificConcept: 'Активация фагоцитоза, подавление вирусной репликации и укрепление мембран',
    associatedNutrients: ['Цинк пиколинат', 'Витамин D3', 'Витамин C', 'Бузина', 'Эхинацея'],
    gradientBg: 'from-violet-950 via-fuchsia-900 to-black',
    accentColor: '#D946EF',
    iconName: 'ShieldCheck',
    fallbackPosterUrl: '/assets/video-studio/immunity.webp'
  }
];

export function findAssetByNutrient(nutrientName: string): MoAAsset {
  const normalized = nutrientName.toLowerCase();
  const match = MOA_ASSETS.find(asset => 
    asset.associatedNutrients.some(n => normalized.includes(n.toLowerCase()) || n.toLowerCase().includes(normalized))
  );
  return match || MOA_ASSETS[0];
}
