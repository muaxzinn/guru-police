import { normalizeTopicTitleKey, SUBJECTS, type SubjectKey } from './constants';

export interface SubTopicCatalogItem {
  subjectKey: SubjectKey;
  title: string;
  displayTitle: string;
  rawTitles: string[];
  count: number;
  category: string;
  description: string;
  questionIds: number[];
}

export const FRIENDLY_TOPIC_LABELS: Record<string, string> = {
  Word: 'Microsoft Word (การจัดการเอกสาร)',
  Excel: 'Microsoft Excel (สูตรและตารางคำนวณ)',
  Powerpoint: 'Microsoft PowerPoint (การนำเสนอ)',
  'Social Media + พื้นฐานโปรแกรม': 'Social Media และพื้นฐานโปรแกรมสำนักงาน',
  วิวัฒนาการคอม: 'วิวัฒนาการคอมพิวเตอร์และยุคของคอมพิวเตอร์',
  'Data & People': 'Data, Information และบุคลากรคอมพิวเตอร์',
  'IPOS Cycle': 'หลักการทำงาน IPOS Cycle',
  'นอก+ใน+ประทับตรา': 'หนังสือภายนอก หนังสือภายใน และหนังสือประทับตรา',
  'ร้อยละ (แผนภูมิ และ กาารเปลี่ยนแปลง)': 'ร้อยละ (แผนภูมิและการเปลี่ยนแปลง)',
};

export function classifyTopic(
  subjectKey: SubjectKey,
  title: string
): { category: string; description: string } {
  const t = title.toLowerCase();

  if (subjectKey === 'com') {
    if (
      title === 'Word' ||
      title === 'Excel' ||
      title === 'Powerpoint' ||
      title.includes('พื้นฐานโปรแกรม')
    ) {
      return {
        category: 'ชุดโปรแกรมสำนักงาน (Word / Excel / PowerPoint)',
        description: 'เมนู คีย์ลัด ฟังก์ชันสูตรคำนวณ และการใช้งานจริงในงานเอกสารตำรวจ',
      };
    }
    if (
      title.includes('เครือข่าย') ||
      title.includes('ความปลอดภัย') ||
      title.includes('อินเทอร์เน็ต') ||
      title.includes('พาณิชย์')
    ) {
      return {
        category: 'เครือข่าย อินเทอร์เน็ต และความปลอดภัย',
        description: 'IP Address, OSI Model, โปรโตคอล และภัยคุกคามไซเบอร์',
      };
    }
    return {
      category: 'ฮาร์ดแวร์ ซอฟต์แวร์ และระบบสารสนเทศ',
      description: 'องค์ประกอบเครื่องคอมพิวเตอร์ IPOS Cycle หน่วยความจำ และข้อมูล',
    };
  }

  if (subjectKey === 'eng') {
    if (title === 'Vocabulary' || title === 'Reading' || title === 'Conversation') {
      return {
        category: 'คำศัพท์ การอ่าน และบทสนทนา',
        description: 'คำศัพท์ที่พบบ่อย ป้ายประกาศ บทความ และการโต้ตอบสถานการณ์จริง',
      };
    }
    return {
      category: 'ไวยากรณ์ (Grammar & Structure)',
      description: 'Parts of Speech, Tense, Passive Voice, Clause และคำเชื่อมประโยค',
    };
  }

  if (subjectKey === 'thai') {
    if (
      title.includes('สาระสำคัญ') ||
      title.includes('อนุมาน') ||
      title.includes('ด้านใน') ||
      title.includes('จุดประสงค์') ||
      title.includes('ข้อคิด') ||
      title.includes('ทรรศนะ')
    ) {
      return {
        category: 'การอ่านจับใจความและวิเคราะห์',
        description: 'หาใจความสำคัญ การอนุมาน เจตนาผู้เขียน และข้อคิดจากบทความ',
      };
    }
    if (
      title.includes('โวหาร') ||
      title.includes('อุปมา') ||
      title.includes('สำนวน') ||
      title.includes('อุดมคติ') ||
      title.includes('ชีวิตประจำวัน')
    ) {
      return {
        category: 'โวหาร สำนวน และความหมายแฝง',
        description: 'ภาพพจน์ สำนวนสุภาษิต ความหมายโดยตรง/โดยนัย และการสื่อความหมาย',
      };
    }
    return {
      category: 'หลักภาษาและการใช้คำ',
      description: 'การสะกดคำ คำทับศัพท์ ลักษณนาม ราชาศัพท์ ระดับภาษา และประโยคกำกวม',
    };
  }

  if (subjectKey === 'math') {
    if (
      title.includes('สามเหลี่ยม') ||
      title.includes('เรขาคณิต') ||
      title.includes('พื้นที่')
    ) {
      return {
        category: 'เรขาคณิต พื้นที่ และปริมาตร',
        description: 'รูปสามเหลี่ยม พีทาโกรัส พื้นที่รูปทรง และปริมาตรทรงเรขาคณิต',
      };
    }
    if (
      title.includes('อุปมา') ||
      title.includes('อนุกรม') ||
      title === 'IQ' ||
      title.includes('ตรรกศาสตร์') ||
      title.includes('เหตุผล') ||
      title === 'รูปภาพ' ||
      title === 'เซต' ||
      title.includes('ความน่าจะเป็น') ||
      title === 'สถิติ'
    ) {
      return {
        category: 'อนุกรม ตรรกศาสตร์ เชาวน์ และสถิติ',
        description: 'อนุกรมตัวเลข/รูปภาพ อุปมาอุปไมย เซต ความน่าจะเป็น และวิเคราะห์ข้อมูล',
      };
    }
    return {
      category: 'พีชคณิต สมการ ร้อยละ และเลขพื้นฐาน',
      description: 'สมการ อสมการ เลขยกกำลัง ห.ร.ม./ค.ร.น. อัตราส่วน และโจทย์ร้อยละ',
    };
  }

  if (subjectKey === 'law') {
    if (t.includes('แพ่ง')) {
      return {
        category: 'กฎหมายแพ่งและพาณิชย์',
        description: 'บุคคล ทรัพย์สิน นิติกรรม สัญญา ครอบครัว และมรดก',
      };
    }
    if (t.includes('อาญา')) {
      return {
        category: 'กฎหมายอาญา',
        description: 'ความผิดอาญา โทษ เหตุยกเว้นความผิด และความผิดเกี่ยวกับบุคคล/ทรัพย์',
      };
    }
    return {
      category: 'รัฐธรรมนูญ ปกครอง และกฎหมายทั่วไป',
      description: 'รัฐธรรมนูญ พ.ร.บ.ปกครอง กฎหมายแรงงาน และความรู้กฎหมายประจำวัน',
    };
  }

  if (subjectKey === 'doc') {
    if (title.includes('(54)')) {
      return {
        category: 'กฎหมายลักษณะที่ 54 (ระเบียบงานสารบรรณ)',
        description: 'เนื้อหาเรียงตามหมวด/บทของกฎหมายลักษณะที่ 54 และสำนักงานตำรวจแห่งชาติ',
      };
    }
    return {
      category: 'ชนิดหนังสือและการรับ-ส่ง/เก็บรักษา',
      description: 'แบบหนังสือราชการ 6 ชนิด ซอง ตราครุฑ การรับ-ส่ง เก็บรักษา ยืม ทำลาย',
    };
  }

  if (
    title.includes('พุทธ') ||
    title.includes('ศาสนา') ||
    title.includes('ประเพณี') ||
    title.includes('วัฒนธรรม') ||
    title.includes('ประวัติศาสตร์') ||
    title.includes('ภูมิศาสตร์')
  ) {
    return {
      category: 'ศาสนา ประเพณี ประวัติศาสตร์ และภูมิศาสตร์',
      description: 'วันสำคัญ หลักธรรมศาสนา ประเพณีไทย และเหตุการณ์สำคัญทางประวัติศาสตร์',
    };
  }
  if (title.includes('เศรษฐกิจพอเพียง') || title.includes('เกษตรทฤษฎีใหม่')) {
    return {
      category: 'เศรษฐกิจพอเพียงและโครงการพระราชดำริ',
      description: '3 ห่วง 2 เงื่อนไข เกษตรทฤษฎีใหม่ และแนวทางพัฒนาตามพระราชดำริ',
    };
  }
  return {
    category: 'อาเซียน สังคมวิทยา และยุทธศาสตร์ชาติ',
    description: 'ประชาคมอาเซียน Thailand 4.0 ธรรมาภิบาล และโครงสร้างทางสังคม',
  };
}

export function buildSubTopicsCatalog(
  allQuestions: Array<{ id?: number; subject_key: SubjectKey; title?: string | null }>
): {
  topicsBySubject: Record<SubjectKey, SubTopicCatalogItem[]>;
  subjectTotals: Record<SubjectKey, number>;
  totalTopicCards: number;
} {
  const subjectTotals = Object.fromEntries(
    SUBJECTS.map((s) => [s.key, 0])
  ) as Record<SubjectKey, number>;

  const mergedGroups = new Map<
    string,
    {
      subjectKey: SubjectKey;
      variants: Map<string, number>;
      count: number;
      questionIds: number[];
    }
  >();

  for (const q of allQuestions) {
    subjectTotals[q.subject_key] = (subjectTotals[q.subject_key] || 0) + 1;
    const rawTitle = (q.title || 'อื่น ๆ').trim();
    const normKey = `${q.subject_key}::${normalizeTopicTitleKey(rawTitle)}`;
    const group = mergedGroups.get(normKey);
    if (group) {
      group.count += 1;
      if (typeof q.id === 'number') group.questionIds.push(q.id);
      group.variants.set(rawTitle, (group.variants.get(rawTitle) || 0) + 1);
    } else {
      mergedGroups.set(normKey, {
        subjectKey: q.subject_key,
        variants: new Map([[rawTitle, 1]]),
        count: 1,
        questionIds: typeof q.id === 'number' ? [q.id] : [],
      });
    }
  }

  const topicsBySubject = Object.fromEntries(
    SUBJECTS.map((s) => [s.key, [] as SubTopicCatalogItem[]])
  ) as Record<SubjectKey, SubTopicCatalogItem[]>;

  for (const group of mergedGroups.values()) {
    const sortedVariants = Array.from(group.variants.entries()).sort((a, b) => b[1] - a[1]);
    const primaryTitle = sortedVariants[0][0];
    const rawTitles = sortedVariants.map(([name]) => name);
    const displayTitle = FRIENDLY_TOPIC_LABELS[primaryTitle] || primaryTitle;
    const { category, description } = classifyTopic(group.subjectKey, primaryTitle);
    group.questionIds.sort((a, b) => a - b);

    topicsBySubject[group.subjectKey].push({
      subjectKey: group.subjectKey,
      title: primaryTitle,
      displayTitle,
      rawTitles,
      count: group.count,
      category,
      description,
      questionIds: group.questionIds,
    });
  }

  for (const s of SUBJECTS) {
    topicsBySubject[s.key].sort((a, b) => b.count - a.count);
  }

  const totalTopicCards = Object.values(topicsBySubject).reduce(
    (sum, list) => sum + list.length,
    0
  );

  return {
    topicsBySubject,
    subjectTotals,
    totalTopicCards,
  };
}
