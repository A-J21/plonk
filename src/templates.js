// Starter templates. Each returns a fresh block array.
import { makeBlock as m } from './blocks.js';

const col = (n, slots, props = {}, style = {}) => m('columns', { n, ...props }, style, slots);

export const TEMPLATES = {
  doc: [
    { id: 'blank', name: 'Blank page', emoji: '📄', theme: 'paper', blocks: () => [m('heading', { text: 'Untitled document' }), m('text', { text: 'Drag blocks from the left, or just start typing.' })] },
    {
      id: 'resume', name: 'Résumé', emoji: '🧑‍💼', theme: 'paper',
      blocks: () => [
        col(2, [
          [m('heading', { text: 'Sam Rivera', level: '1' }), m('text', { text: 'Product designer who ships. Loves systems, hates clutter.' }, { color: '#666' })],
          [m('text', { text: 'sam@example.com<br>+1 555 0100<br>samrivera.design' }, { align: 'right', size: 14 })],
        ], { valign: 'end' }),
        m('divider', { variant: 'thick' }),
        m('heading', { text: 'Experience', level: '2' }),
        m('heading', { text: 'Senior Designer — Blockworks · 2023–now', level: '3' }),
        m('list', { items: ['Led redesign of the core editor; +34% weekly actives', 'Built the design system used by 40 engineers', 'Mentored four junior designers'] }),
        m('heading', { text: 'Designer — Pixel & Co · 2020–2023', level: '3' }),
        m('list', { items: ['Shipped 12 client websites end-to-end', 'Ran weekly critique sessions'] }),
        m('heading', { text: 'Skills', level: '2' }),
        m('badges', { items: ['Figma', 'Prototyping', 'HTML/CSS', 'User research', 'Typography'] }),
        m('heading', { text: 'Education', level: '2' }),
        m('text', { text: '<b>BFA, Graphic Design</b> — State University, 2020' }),
      ],
    },
    {
      id: 'letter', name: 'Letter', emoji: '✉️', theme: 'paper',
      blocks: () => [
        m('text', { text: '<b>Alex Moreno</b><br>12 Maple Street<br>Springfield' }, { align: 'right' }),
        m('spacer', { h: 24 }),
        m('text', { text: 'September 28, 2026' }),
        m('text', { text: 'Dear Hiring Team,' }),
        m('text', { text: 'I am writing to express my interest in the role. Over the past five years I have built things people genuinely enjoy using, and I would love to bring that energy to your team.' }),
        m('text', { text: 'Thank you for your time and consideration. I look forward to hearing from you.' }),
        m('text', { text: 'Warm regards,' }),
        m('signature', { name: 'Alex Moreno', role: 'Applicant', date: false }),
      ],
    },
    {
      id: 'report', name: 'Report', emoji: '📊', theme: 'pop',
      blocks: () => [
        m('badges', { items: ['Q3 2026', 'Internal'] }),
        m('heading', { text: 'Quarterly Report: The Big Picture' }),
        m('text', { text: 'A quick look at what worked, what didn’t, and what we’re doing next.' }, { size: 19 }),
        m('toc', { depth: 2 }, { bg: 'var(--pk-surface)', padding: 20, radius: 14 }),
        col(3, [[m('stat', { n: '+42%', label: 'Revenue' })], [m('stat', { n: '1.2k', label: 'New customers' })], [m('stat', { n: '4.8★', label: 'Avg. rating' })]], {}, { bg: 'var(--pk-surface)', radius: 18, padding: 24 }),
        m('heading', { text: 'Highlights', level: '2' }),
        m('list', { items: ['Launched the new onboarding flow', 'Cut support tickets by a third', 'Hired six brilliant people'] }),
        m('callout', { icon: '🚀', text: '<b>Next quarter:</b> double down on what’s working and kill two projects that aren’t.' }),
        m('heading', { text: 'By the numbers', level: '2' }),
        m('table', {}),
        m('quote', { text: 'Best quarter we’ve had. Let’s keep the momentum.', cite: 'The CEO' }),
        m('footnote', { text: 'Figures are unaudited and rounded to the nearest percent.' }),
      ],
    },
    {
      id: 'zine', name: 'Zine / Poster', emoji: '🎸', theme: 'midnight',
      blocks: () => [
        m('heading', { text: 'LOUD THINGS FOR QUIET PEOPLE' }, { size: 64, upper: true }),
        m('divider', { variant: 'wavy' }),
        col(2, [[m('text', { text: 'Issue #07 is all about making noise without saying a word. Posters, stickers, and the art of the loud font.' })], [m('callout', { icon: '⚡', text: 'Cut out, fold, pass it on.' }, { rotate: -3 })]]),
        m('image', { caption: 'Your photo here' }),
        m('quote', { text: 'Make it bold. Then make it bolder.' }),
      ],
    },
  ],
  site: [
    {
      id: 'blank', name: 'Blank site', emoji: '🌐', theme: 'pop',
      pages: () => [
        { name: 'Home', blocks: [m('navbar'), m('spacer', { h: 40 }), m('heading', { text: 'Hello, world.' }, { align: 'center' }), m('footer')] },
        { name: 'About', blocks: [m('navbar'), m('heading', { text: 'About', level: '1' }), m('text', { text: 'Tell people who you are.' }), m('footer')] },
      ],
    },
    {
      id: 'landing', name: 'Landing page', emoji: '🚀', theme: 'pop',
      pages: () => [
        {
          name: 'Home',
          blocks: [
            m('navbar', { brand: 'Plonkify' }),
            m('hero', { title: 'Build it by dropping it.', sub: 'The ridiculously fun way to make pages. Grab a block, drop it, done.', href: 'page:pricing' }),
            m('spacer', { h: 24 }),
            m('features'),
            m('spacer', { h: 32 }),
            m('testimonial'),
            m('spacer', { h: 32 }),
            m('section', {}, { bg: '#140F2D', color: '#FFF6E5', radius: 24, padding: 48, align: 'center' }, [[m('heading', { text: 'Ready to make some noise?', level: '2' }), m('text', { text: 'Join thousands of block-droppers today.' }), m('button', { label: 'See pricing', href: 'page:pricing' })]]),
            m('footer'),
          ],
        },
        { id: 'pricing', name: 'Pricing', blocks: [m('navbar', { brand: 'Plonkify' }), m('heading', { text: 'Simple, loud pricing', level: '1' }, { align: 'center' }), m('text', { text: 'Pick a plan. Change your mind whenever.' }, { align: 'center' }), m('spacer', { h: 24 }), m('pricing'), m('spacer', { h: 40 }), m('faq'), m('footer')] },
        { name: 'Contact', blocks: [m('navbar', { brand: 'Plonkify' }), m('contact'), m('footer')] },
      ],
    },
    {
      id: 'portfolio', name: 'Portfolio', emoji: '🎨', theme: 'mint',
      pages: () => [
        {
          name: 'Work',
          blocks: [
            m('navbar', { brand: 'jo.makes' }),
            m('heading', { text: 'I design things that feel good to touch.' }, { size: 56, maxw: 80, balign: 'left' }),
            m('badges', { items: ['Brand', 'Product', 'Illustration'] }),
            m('spacer', { h: 24 }),
            m('gallery', { cols: 2, ratio: '4/3' }),
            m('footer', { text: '© 2026 Jo. All blocks reserved.' }),
          ],
        },
        { name: 'About', blocks: [m('navbar', { brand: 'jo.makes' }), m('columns', {}, {}, [[m('image', { ratio: '3/4' })], [m('heading', { text: 'Hi, I’m Jo.', level: '1' }), m('text', { text: 'Designer based somewhere sunny. Previously at a few places you’ve heard of.' }), m('badges', { items: ['Figma', 'Procreate', 'Blender'], layout: 'compact' })]]), m('footer', { text: '© 2026 Jo. All blocks reserved.' })] },
        { name: 'Say hi', blocks: [m('navbar', { brand: 'jo.makes' }), m('contact', { title: 'Let’s make something' }), m('footer', { text: '© 2026 Jo. All blocks reserved.' })] },
      ],
    },
    {
      id: 'event', name: 'Event page', emoji: '🎉', theme: 'sunset',
      pages: () => [
        {
          name: 'Home',
          blocks: [
            m('navbar', { brand: 'BLOCKPARTY 26' }),
            m('hero', { title: 'Blockparty 2026', sub: 'One night. Twelve DJs. Zero boring moments. Oct 31 · The Warehouse', cta: 'Grab tickets', href: 'page:tickets' }, { bg: 'linear-gradient(135deg,#7B2FF7,#FF5D3A)', color: '#fff' }),
            m('columns', { n: 3 }, {}, [[m('stat', { n: '12', label: 'Artists' })], [m('stat', { n: '8h', label: 'Of music' })], [m('stat', { n: '1', label: 'Legendary night' })]]),
            m('video'),
            m('footer', { text: 'Blockparty · Doors 9pm · 18+' }),
          ],
        },
        { name: 'Lineup', blocks: [m('navbar', { brand: 'BLOCKPARTY 26' }), m('heading', { text: 'Lineup', level: '1' }, { align: 'center' }), m('badges', { items: ['DJ Plonk', 'The Blocks', 'Neon Grid', 'Sub Sonic', 'Mira K', 'Low Tide'], layout: 'grid', shape: 'solid' }), m('footer', { text: 'Blockparty · Doors 9pm · 18+' })] },
        { id: 'tickets', name: 'Tickets', blocks: [m('navbar', { brand: 'BLOCKPARTY 26' }), m('pricing', { plans: [{ name: 'Early bird', price: '$25', per: '', features: ['Entry before 11pm'], cta: 'Buy' }, { name: 'General', price: '$35', per: '', features: ['All night entry', 'Free coat check'], cta: 'Buy' }, { name: 'VIP', price: '$80', per: '', features: ['Balcony access', 'Two drinks', 'Merch'], cta: 'Buy' }] }), m('faq'), m('footer', { text: 'Blockparty · Doors 9pm · 18+' })] },
      ],
    },
  ],
};
