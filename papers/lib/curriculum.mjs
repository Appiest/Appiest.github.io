export const FOUNDATIONS_TOTAL = 21;
export const FIRST_FRONTIER_DAY = FOUNDATIONS_TOTAL + 1;
export const FRONTIER_WEEK_LENGTH = 7;

export const FOUNDATIONS = [
  { day: 1, year: 1950, authors: "Turing", short_title: "Computing Machinery and Intelligence" },
  { day: 2, year: 1986, authors: "Rumelhart, Hinton & Williams", short_title: "Backpropagation" },
  { day: 3, year: 2012, authors: "Krizhevsky et al.", short_title: "AlexNet" },
  { day: 4, year: 2013, authors: "Mikolov et al.", short_title: "word2vec" },
  { day: 5, year: 2014, authors: "Sutskever et al.", short_title: "Sequence to Sequence Learning" },
  { day: 6, year: 2015, authors: "Mnih et al.", short_title: "DQN" },
  { day: 7, year: 2014, authors: "Goodfellow et al.", short_title: "GANs" },
  { day: 8, year: 2015, authors: "He et al.", short_title: "ResNet" },
  { day: 9, year: 2017, authors: "Vaswani et al.", short_title: "Attention Is All You Need" },
  { day: 10, year: 2018, authors: "Devlin et al.", short_title: "BERT" },
  { day: 11, year: 2020, authors: "Brown et al.", short_title: "GPT-3" },
  { day: 12, year: 2020, authors: "Ho et al.", short_title: "Diffusion (DDPM)" },
  { day: 13, year: 2020, authors: "Mildenhall et al.", short_title: "NeRF" },
  { day: 14, year: 2020, authors: "Lewis et al.", short_title: "RAG" },
  { day: 15, year: 2021, authors: "Radford et al.", short_title: "CLIP" },
  { day: 16, year: 2022, authors: "Ouyang et al.", short_title: "InstructGPT / RLHF" },
  { day: 17, year: 2022, authors: "Wei et al.", short_title: "Chain-of-Thought" },
  { day: 18, year: 2022, authors: "Yao et al.", short_title: "ReAct" },
  { day: 19, year: 2022, authors: "Radford et al.", short_title: "Whisper" },
  { day: 20, year: 2023, authors: "Kerbl et al.", short_title: "3D Gaussian Splatting" },
  { day: 21, year: 2023, authors: "Brohan et al.", short_title: "RT-2" },
];

export const FOUNDATION_SECTIONS = [
  { name: "Origins", firstDay: 1, lastDay: 2 },
  { name: "Deep learning takes off", firstDay: 3, lastDay: 8 },
  { name: "The Transformer era", firstDay: 9, lastDay: 11 },
  { name: "Generative and multimodal", firstDay: 12, lastDay: 15 },
  { name: "Making models useful", firstDay: 16, lastDay: 19 },
  { name: "Into the physical world", firstDay: 20, lastDay: 21 },
];

export function isFoundationDay(day) {
  return day <= FOUNDATIONS_TOTAL;
}
