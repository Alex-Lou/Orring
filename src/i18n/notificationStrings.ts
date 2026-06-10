/**
 * Notification copy, localized for all 10 supported languages.
 *
 * Why a dedicated module (vs. the main `translations.ts`): notification
 * text is resolved OUTSIDE React — `src/utils/notifications.ts` schedules
 * reminders from plain async functions, so it can't use the `useTranslation`
 * hook. Keeping this copy together in one typed map makes it trivial to
 * resolve `getNotifCopy(i18n.language)` at schedule time and keeps the
 * notification wording reviewable in a single place. The `NotifCopy`
 * interface guarantees (via TypeScript) that every language defines every
 * message — a missing key is a compile error, not a French notification
 * shipped to a Japanese user.
 *
 * Note: text is baked at SCHEDULE time. The store reschedules on boot and
 * on every relevant mutation, so a language change is reflected on the next
 * reschedule (and the Android channel name updates on the next schedule via
 * `setNotificationChannelAsync`).
 */

export interface NotifMessage {
  title: string;
  body: string;
}

export interface NotifCopy {
  /** Android notification channel name (visible in system settings). */
  channelName: string;
  // Ring removal reminders (J-7 / J-1 / day-of).
  removeJ7: NotifMessage;
  removeJ1: NotifMessage;
  removeJ0: NotifMessage;
  // Removal overdue nudges — fire only while the ring is still IN past the
  // removal date (J+1 / J+3).
  removeOverdue1: NotifMessage;
  removeOverdue3: NotifMessage;
  // Next-cycle ring re-insertion reminders (J-7 / J-1 / day-of).
  insertJ7: NotifMessage;
  insertJ1: NotifMessage;
  insertJ0: NotifMessage;
  // Re-insertion overdue nudges — fire only while the ring is still OUT past
  // the re-insertion date (J+1 / J+3).
  insertOverdue1: NotifMessage;
  insertOverdue3: NotifMessage;
  // Period prediction reminders.
  periodJ2: NotifMessage;
  periodJ0: NotifMessage;
  periodLate: NotifMessage;
  // Stale open-period nudge.
  periodOpen: NotifMessage;
  // Temporary (3h) removal timer.
  tempRemoval: NotifMessage;
}

export const NOTIF_COPY: Record<string, NotifCopy> = {
  fr: {
    channelName: 'Rappels Orring',
    removeJ7: { title: '⭕ Orring — Dans 7 jours', body: "Pense à retirer ton anneau dans 7 jours." },
    removeJ1: { title: '♻️ Orring — Demain !', body: "C'est demain qu'il faut retirer ton anneau." },
    removeJ0: { title: "♻️ Orring — C'est aujourd'hui !", body: "C'est le jour de retirer ton anneau." },
    removeOverdue1: { title: '⚠️ Orring — Retrait en retard', body: "L'anneau aurait dû être retiré hier d'après ton planning. Pense à le retirer et à le noter dans l'app." },
    removeOverdue3: { title: '⚠️ Orring — Retrait en retard', body: "3 jours de retard sur le retrait prévu. Quand tu retires l'anneau, note-le pour resynchroniser ton suivi." },
    insertJ7: { title: '⭕ Orring — Dans 7 jours', body: "Pense à remettre ton anneau dans 7 jours." },
    insertJ1: { title: '⭕ Orring — Demain !', body: "C'est demain qu'il faut remettre ton anneau." },
    insertJ0: { title: "⭕ Orring — C'est aujourd'hui !", body: "C'est le jour de remettre ton anneau !" },
    insertOverdue1: { title: '⚠️ Orring — Insertion en retard', body: "Tu devais remettre ton anneau hier d'après ton planning. Pense à le remettre et à le noter dans l'app." },
    insertOverdue3: { title: '⚠️ Orring — Insertion en retard', body: "3 jours de retard sur la réinsertion prévue. Quand tu remets l'anneau, note-le pour resynchroniser ton suivi." },
    periodJ2: { title: '🌸 Orring — Dans 2 jours', body: "Tes règles sont prévues dans 2 jours selon ta moyenne. Tu peux prendre ce qu'il te faut ✨" },
    periodJ0: { title: "🩸 Orring — Aujourd'hui", body: "Date prévue d'après ta moyenne. Reviens marquer le premier jour dans « Mes périodes » dès qu'elles arrivent." },
    periodLate: { title: '🌙 Orring — Léger retard', body: "Tes règles ont 3 jours de retard sur ta moyenne. C'est souvent normal — pense à les logger dès qu'elles arrivent." },
    periodOpen: { title: '🌸 Orring — Tes règles sont-elles finies ?', body: "Tu n'as rien noté depuis 2 jours. Reviens marquer le dernier jour pour fermer ce cycle proprement ✨" },
    tempRemoval: { title: '⏰ Orring — Il est temps de remettre', body: "Ton anneau est retiré depuis 3h. Pense à le remettre pour ne pas perdre l'efficacité !" },
  },
  en: {
    channelName: 'Orring reminders',
    removeJ7: { title: '⭕ Orring — In 7 days', body: 'Remember to take your ring out in 7 days.' },
    removeJ1: { title: '♻️ Orring — Tomorrow!', body: 'Tomorrow is the day to take your ring out.' },
    removeJ0: { title: '♻️ Orring — Today!', body: 'Today is the day to take your ring out.' },
    removeOverdue1: { title: '⚠️ Orring — Removal overdue', body: 'Your ring was due to come out yesterday per your schedule. Take it out and log it in the app.' },
    removeOverdue3: { title: '⚠️ Orring — Removal overdue', body: 'It is 3 days past your scheduled removal. When you take the ring out, log it to resync your tracking.' },
    insertJ7: { title: '⭕ Orring — In 7 days', body: 'Remember to put your ring back in 7 days.' },
    insertJ1: { title: '⭕ Orring — Tomorrow!', body: 'Tomorrow is the day to put your ring back in.' },
    insertJ0: { title: '⭕ Orring — Today!', body: 'Today is the day to put your ring back in!' },
    insertOverdue1: { title: '⚠️ Orring — Insertion overdue', body: 'Your ring was due to go back in yesterday per your schedule. Put it back and log it in the app.' },
    insertOverdue3: { title: '⚠️ Orring — Insertion overdue', body: 'It is 3 days past your scheduled re-insertion. When you put the ring back, log it to resync your tracking.' },
    periodJ2: { title: '🌸 Orring — In 2 days', body: 'Your period is expected in 2 days based on your average. You can get ready ✨' },
    periodJ0: { title: '🩸 Orring — Today', body: 'Expected date based on your average. Come mark the first day in “My periods” as soon as it starts.' },
    periodLate: { title: '🌙 Orring — A little late', body: "Your period is 3 days later than your average. That's often normal — log it as soon as it arrives." },
    periodOpen: { title: '🌸 Orring — Has your period ended?', body: "You haven't logged anything for 2 days. Mark the last day to close this cycle cleanly ✨" },
    tempRemoval: { title: '⏰ Orring — Time to put it back', body: 'Your ring has been out for 3 hours. Put it back so it stays effective!' },
  },
  nl: {
    channelName: 'Orring-herinneringen',
    removeJ7: { title: '⭕ Orring — Over 7 dagen', body: 'Denk eraan je ring over 7 dagen te verwijderen.' },
    removeJ1: { title: '♻️ Orring — Morgen!', body: 'Morgen moet je je ring verwijderen.' },
    removeJ0: { title: '♻️ Orring — Vandaag!', body: 'Vandaag is de dag om je ring te verwijderen.' },
    removeOverdue1: { title: '⚠️ Orring — Verwijderen te laat', body: 'Volgens je planning had je ring gisteren verwijderd moeten worden. Verwijder hem en noteer het in de app.' },
    removeOverdue3: { title: '⚠️ Orring — Verwijderen te laat', body: 'Je bent 3 dagen over je geplande verwijdering. Noteer het wanneer je de ring verwijdert om je tracking te synchroniseren.' },
    insertJ7: { title: '⭕ Orring — Over 7 dagen', body: 'Denk eraan je ring over 7 dagen terug te plaatsen.' },
    insertJ1: { title: '⭕ Orring — Morgen!', body: 'Morgen moet je je ring terugplaatsen.' },
    insertJ0: { title: '⭕ Orring — Vandaag!', body: 'Vandaag is de dag om je ring terug te plaatsen!' },
    insertOverdue1: { title: '⚠️ Orring — Terugplaatsen te laat', body: 'Volgens je planning had je je ring gisteren moeten terugplaatsen. Plaats hem terug en noteer het in de app.' },
    insertOverdue3: { title: '⚠️ Orring — Terugplaatsen te laat', body: 'Je bent 3 dagen over je geplande terugplaatsing. Noteer het wanneer je de ring terugplaatst om je tracking te synchroniseren.' },
    periodJ2: { title: '🌸 Orring — Over 2 dagen', body: 'Je menstruatie wordt over 2 dagen verwacht volgens je gemiddelde. Je kunt je voorbereiden ✨' },
    periodJ0: { title: '🩸 Orring — Vandaag', body: 'Verwachte datum volgens je gemiddelde. Markeer de eerste dag in “Mijn periodes” zodra ze begint.' },
    periodLate: { title: '🌙 Orring — Lichte vertraging', body: 'Je menstruatie is 3 dagen later dan je gemiddelde. Dat is vaak normaal — noteer het zodra ze begint.' },
    periodOpen: { title: '🌸 Orring — Is je menstruatie voorbij?', body: 'Je hebt 2 dagen niets genoteerd. Markeer de laatste dag om deze cyclus netjes af te sluiten ✨' },
    tempRemoval: { title: '⏰ Orring — Tijd om terug te plaatsen', body: 'Je ring is al 3 uur verwijderd. Plaats hem terug zodat hij effectief blijft!' },
  },
  ru: {
    channelName: 'Напоминания Orring',
    removeJ7: { title: '⭕ Orring — Через 7 дней', body: 'Не забудь извлечь кольцо через 7 дней.' },
    removeJ1: { title: '♻️ Orring — Завтра!', body: 'Завтра нужно извлечь кольцо.' },
    removeJ0: { title: '♻️ Orring — Сегодня!', body: 'Сегодня день, когда нужно извлечь кольцо.' },
    removeOverdue1: { title: '⚠️ Orring — Извлечение просрочено', body: 'По твоему плану кольцо нужно было извлечь вчера. Извлеки его и отметь это в приложении.' },
    removeOverdue3: { title: '⚠️ Orring — Извлечение просрочено', body: 'Уже 3 дня с запланированного извлечения. Когда извлечёшь кольцо, отметь это, чтобы пересинхронизировать отслеживание.' },
    insertJ7: { title: '⭕ Orring — Через 7 дней', body: 'Не забудь снова вставить кольцо через 7 дней.' },
    insertJ1: { title: '⭕ Orring — Завтра!', body: 'Завтра нужно снова вставить кольцо.' },
    insertJ0: { title: '⭕ Orring — Сегодня!', body: 'Сегодня день, когда нужно снова вставить кольцо!' },
    insertOverdue1: { title: '⚠️ Orring — Вставка просрочена', body: 'По твоему плану кольцо нужно было снова вставить вчера. Вставь его и отметь это в приложении.' },
    insertOverdue3: { title: '⚠️ Orring — Вставка просрочена', body: 'Уже 3 дня с запланированной повторной вставки. Когда вставишь кольцо, отметь это, чтобы пересинхронизировать отслеживание.' },
    periodJ2: { title: '🌸 Orring — Через 2 дня', body: 'По твоему среднему циклу месячные ожидаются через 2 дня. Можешь подготовиться ✨' },
    periodJ0: { title: '🩸 Orring — Сегодня', body: 'Ожидаемая дата по твоему среднему циклу. Отметь первый день в разделе «Мои периоды», как только они начнутся.' },
    periodLate: { title: '🌙 Orring — Небольшая задержка', body: 'Месячные опаздывают на 3 дня от твоего среднего. Часто это нормально — отметь их, как только начнутся.' },
    periodOpen: { title: '🌸 Orring — Месячные закончились?', body: 'Ты ничего не отмечала уже 2 дня. Отметь последний день, чтобы аккуратно закрыть этот цикл ✨' },
    tempRemoval: { title: '⏰ Orring — Пора вставить обратно', body: 'Кольцо извлечено уже 3 часа. Вставь его обратно, чтобы сохранить эффективность!' },
  },
  es: {
    channelName: 'Recordatorios de Orring',
    removeJ7: { title: '⭕ Orring — En 7 días', body: 'Recuerda retirar tu anillo en 7 días.' },
    removeJ1: { title: '♻️ Orring — ¡Mañana!', body: 'Mañana toca retirar tu anillo.' },
    removeJ0: { title: '♻️ Orring — ¡Hoy!', body: 'Hoy es el día de retirar tu anillo.' },
    removeOverdue1: { title: '⚠️ Orring — Retirada atrasada', body: 'Según tu planificación, tu anillo debía salir ayer. Retíralo y regístralo en la app.' },
    removeOverdue3: { title: '⚠️ Orring — Retirada atrasada', body: 'Llevas 3 días de retraso respecto a la retirada prevista. Cuando retires el anillo, regístralo para resincronizar tu seguimiento.' },
    insertJ7: { title: '⭕ Orring — En 7 días', body: 'Recuerda volver a poner tu anillo en 7 días.' },
    insertJ1: { title: '⭕ Orring — ¡Mañana!', body: 'Mañana toca volver a poner tu anillo.' },
    insertJ0: { title: '⭕ Orring — ¡Hoy!', body: '¡Hoy es el día de volver a poner tu anillo!' },
    insertOverdue1: { title: '⚠️ Orring — Colocación atrasada', body: 'Según tu planificación, debías volver a poner tu anillo ayer. Vuelve a ponértelo y regístralo en la app.' },
    insertOverdue3: { title: '⚠️ Orring — Colocación atrasada', body: 'Llevas 3 días de retraso respecto a la recolocación prevista. Cuando vuelvas a poner el anillo, regístralo para resincronizar tu seguimiento.' },
    periodJ2: { title: '🌸 Orring — En 2 días', body: 'Según tu media, tu regla llegará en 2 días. Puedes prepararte ✨' },
    periodJ0: { title: '🩸 Orring — Hoy', body: 'Fecha prevista según tu media. Marca el primer día en «Mis periodos» en cuanto llegue.' },
    periodLate: { title: '🌙 Orring — Ligero retraso', body: 'Tu regla lleva 3 días de retraso respecto a tu media. Suele ser normal: regístrala en cuanto llegue.' },
    periodOpen: { title: '🌸 Orring — ¿Ha terminado tu regla?', body: 'No has anotado nada en 2 días. Marca el último día para cerrar bien este ciclo ✨' },
    tempRemoval: { title: '⏰ Orring — Hora de volver a ponerlo', body: 'Llevas 3 h con el anillo fuera. Vuelve a ponértelo para no perder eficacia.' },
  },
  pt: {
    channelName: 'Lembretes do Orring',
    removeJ7: { title: '⭕ Orring — Em 7 dias', body: 'Lembra-te de retirar o teu anel daqui a 7 dias.' },
    removeJ1: { title: '♻️ Orring — Amanhã!', body: 'Amanhã é dia de retirar o teu anel.' },
    removeJ0: { title: '♻️ Orring — Hoje!', body: 'Hoje é o dia de retirar o teu anel.' },
    removeOverdue1: { title: '⚠️ Orring — Remoção em atraso', body: 'Segundo o teu planeamento, o teu anel devia ter saído ontem. Retira-o e regista-o na app.' },
    removeOverdue3: { title: '⚠️ Orring — Remoção em atraso', body: 'Já passaram 3 dias da remoção prevista. Quando retirares o anel, regista-o para ressincronizar o teu acompanhamento.' },
    insertJ7: { title: '⭕ Orring — Em 7 dias', body: 'Lembra-te de recolocar o teu anel daqui a 7 dias.' },
    insertJ1: { title: '⭕ Orring — Amanhã!', body: 'Amanhã é dia de recolocar o teu anel.' },
    insertJ0: { title: '⭕ Orring — Hoje!', body: 'Hoje é o dia de recolocar o teu anel!' },
    insertOverdue1: { title: '⚠️ Orring — Recolocação em atraso', body: 'Segundo o teu planeamento, devias ter recolocado o teu anel ontem. Volta a colocá-lo e regista-o na app.' },
    insertOverdue3: { title: '⚠️ Orring — Recolocação em atraso', body: 'Já passaram 3 dias da recolocação prevista. Quando voltares a colocar o anel, regista-o para ressincronizar o teu acompanhamento.' },
    periodJ2: { title: '🌸 Orring — Em 2 dias', body: 'Pela tua média, a tua menstruação está prevista para daqui a 2 dias. Podes preparar-te ✨' },
    periodJ0: { title: '🩸 Orring — Hoje', body: 'Data prevista pela tua média. Marca o primeiro dia em «As minhas menstruações» assim que começar.' },
    periodLate: { title: '🌙 Orring — Ligeiro atraso', body: 'A tua menstruação está 3 dias atrasada em relação à tua média. Costuma ser normal — regista-a assim que chegar.' },
    periodOpen: { title: '🌸 Orring — A tua menstruação terminou?', body: 'Não registaste nada há 2 dias. Marca o último dia para fechar este ciclo corretamente ✨' },
    tempRemoval: { title: '⏰ Orring — Hora de recolocar', body: 'O teu anel está fora há 3 h. Volta a colocá-lo para não perder eficácia!' },
  },
  de: {
    channelName: 'Orring-Erinnerungen',
    removeJ7: { title: '⭕ Orring — In 7 Tagen', body: 'Denk daran, deinen Ring in 7 Tagen zu entfernen.' },
    removeJ1: { title: '♻️ Orring — Morgen!', body: 'Morgen ist der Tag, deinen Ring zu entfernen.' },
    removeJ0: { title: '♻️ Orring — Heute!', body: 'Heute ist der Tag, deinen Ring zu entfernen.' },
    removeOverdue1: { title: '⚠️ Orring — Entfernen überfällig', body: 'Laut deinem Plan hätte dein Ring gestern raus müssen. Entferne ihn und trag es in der App ein.' },
    removeOverdue3: { title: '⚠️ Orring — Entfernen überfällig', body: 'Es sind 3 Tage seit dem geplanten Entfernen vergangen. Wenn du den Ring entfernst, trag es ein, um deine Verfolgung zu synchronisieren.' },
    insertJ7: { title: '⭕ Orring — In 7 Tagen', body: 'Denk daran, deinen Ring in 7 Tagen wieder einzusetzen.' },
    insertJ1: { title: '⭕ Orring — Morgen!', body: 'Morgen ist der Tag, deinen Ring wieder einzusetzen.' },
    insertJ0: { title: '⭕ Orring — Heute!', body: 'Heute ist der Tag, deinen Ring wieder einzusetzen!' },
    insertOverdue1: { title: '⚠️ Orring — Einsetzen überfällig', body: 'Laut deinem Plan hättest du deinen Ring gestern wieder einsetzen müssen. Setz ihn wieder ein und trag es in der App ein.' },
    insertOverdue3: { title: '⚠️ Orring — Einsetzen überfällig', body: 'Es sind 3 Tage seit dem geplanten Wiedereinsetzen vergangen. Wenn du den Ring wieder einsetzt, trag es ein, um deine Verfolgung zu synchronisieren.' },
    periodJ2: { title: '🌸 Orring — In 2 Tagen', body: 'Laut deinem Durchschnitt wird deine Periode in 2 Tagen erwartet. Du kannst dich vorbereiten ✨' },
    periodJ0: { title: '🩸 Orring — Heute', body: 'Erwartetes Datum laut deinem Durchschnitt. Markiere den ersten Tag unter „Meine Perioden“, sobald sie beginnt.' },
    periodLate: { title: '🌙 Orring — Leichte Verspätung', body: 'Deine Periode ist 3 Tage später als dein Durchschnitt. Das ist oft normal — trag sie ein, sobald sie kommt.' },
    periodOpen: { title: '🌸 Orring — Ist deine Periode vorbei?', body: 'Du hast seit 2 Tagen nichts eingetragen. Markiere den letzten Tag, um diesen Zyklus sauber abzuschließen ✨' },
    tempRemoval: { title: '⏰ Orring — Zeit zum Wiedereinsetzen', body: 'Dein Ring ist seit 3 Stunden draußen. Setz ihn wieder ein, damit er wirksam bleibt!' },
  },
  ar: {
    channelName: 'تذكيرات Orring',
    removeJ7: { title: '⭕ Orring — خلال 7 أيام', body: 'تذكّري إزالة الحلقة خلال 7 أيام.' },
    removeJ1: { title: '♻️ Orring — غدًا!', body: 'غدًا موعد إزالة الحلقة.' },
    removeJ0: { title: '♻️ Orring — اليوم!', body: 'اليوم هو يوم إزالة الحلقة.' },
    removeOverdue1: { title: '⚠️ Orring — تأخّر في الإزالة', body: 'حسب جدولك كان يجب إزالة الحلقة أمس. أزيليها وسجّلي ذلك في التطبيق.' },
    removeOverdue3: { title: '⚠️ Orring — تأخّر في الإزالة', body: 'مرّت 3 أيام على موعد الإزالة المقرر. عند إزالة الحلقة، سجّلي ذلك لإعادة مزامنة متابعتك.' },
    insertJ7: { title: '⭕ Orring — خلال 7 أيام', body: 'تذكّري إعادة وضع الحلقة خلال 7 أيام.' },
    insertJ1: { title: '⭕ Orring — غدًا!', body: 'غدًا موعد إعادة وضع الحلقة.' },
    insertJ0: { title: '⭕ Orring — اليوم!', body: 'اليوم هو يوم إعادة وضع الحلقة!' },
    insertOverdue1: { title: '⚠️ Orring — تأخّر في الإدخال', body: 'حسب جدولك كان يجب إعادة وضع الحلقة أمس. أعيدي وضعها وسجّلي ذلك في التطبيق.' },
    insertOverdue3: { title: '⚠️ Orring — تأخّر في الإدخال', body: 'مرّت 3 أيام على موعد إعادة الوضع المقرر. عند إعادة وضع الحلقة، سجّلي ذلك لإعادة مزامنة متابعتك.' },
    periodJ2: { title: '🌸 Orring — خلال يومين', body: 'حسب متوسطك، من المتوقع أن تأتي دورتك خلال يومين. يمكنك الاستعداد ✨' },
    periodJ0: { title: '🩸 Orring — اليوم', body: 'التاريخ المتوقع حسب متوسطك. سجّلي أول يوم في «دوراتي» بمجرد أن تبدأ.' },
    periodLate: { title: '🌙 Orring — تأخّر بسيط', body: 'دورتك متأخرة 3 أيام عن متوسطك. غالبًا يكون هذا طبيعيًا — سجّليها بمجرد أن تأتي.' },
    periodOpen: { title: '🌸 Orring — هل انتهت دورتك؟', body: 'لم تسجّلي شيئًا منذ يومين. سجّلي آخر يوم لإغلاق هذه الدورة بشكل صحيح ✨' },
    tempRemoval: { title: '⏰ Orring — حان وقت إعادتها', body: 'مرّت 3 ساعات على إزالة الحلقة. أعيديها للحفاظ على فعاليتها!' },
  },
  zh: {
    channelName: 'Orring 提醒',
    removeJ7: { title: '⭕ Orring — 7 天后', body: '记得 7 天后取出指环。' },
    removeJ1: { title: '♻️ Orring — 明天！', body: '明天该取出指环了。' },
    removeJ0: { title: '♻️ Orring — 就是今天！', body: '今天该取出指环了。' },
    removeOverdue1: { title: '⚠️ Orring — 取出已逾期', body: '按你的计划，指环昨天就该取出了。请取出并在应用中记录。' },
    removeOverdue3: { title: '⚠️ Orring — 取出已逾期', body: '已超过预定取出时间 3 天。取出指环后请记录，以重新同步你的追踪。' },
    insertJ7: { title: '⭕ Orring — 7 天后', body: '记得 7 天后重新戴上指环。' },
    insertJ1: { title: '⭕ Orring — 明天！', body: '明天该重新戴上指环了。' },
    insertJ0: { title: '⭕ Orring — 就是今天！', body: '今天该重新戴上指环了！' },
    insertOverdue1: { title: '⚠️ Orring — 戴回已逾期', body: '按你的计划，指环昨天就该重新戴上了。请戴回并在应用中记录。' },
    insertOverdue3: { title: '⚠️ Orring — 戴回已逾期', body: '已超过预定重新戴上时间 3 天。戴回指环后请记录，以重新同步你的追踪。' },
    periodJ2: { title: '🌸 Orring — 2 天后', body: '根据你的平均周期，月经预计 2 天后到来。可以提前做好准备 ✨' },
    periodJ0: { title: '🩸 Orring — 今天', body: '这是根据你的平均周期预测的日期。月经一开始，就在「我的经期」中标记第一天吧。' },
    periodLate: { title: '🌙 Orring — 略有推迟', body: '你的月经比平均晚了 3 天。这通常是正常的——一来就记录下来吧。' },
    periodOpen: { title: '🌸 Orring — 月经结束了吗？', body: '你已经 2 天没有记录了。标记最后一天，把这个周期妥善结束吧 ✨' },
    tempRemoval: { title: '⏰ Orring — 该戴回去了', body: '指环已取出 3 小时。请戴回去以保持避孕效果！' },
  },
  ja: {
    channelName: 'Orring のリマインダー',
    removeJ7: { title: '⭕ Orring — 7日後', body: '7日後にリングを外すのを忘れずに。' },
    removeJ1: { title: '♻️ Orring — 明日！', body: '明日はリングを外す日です。' },
    removeJ0: { title: '♻️ Orring — 今日です！', body: '今日はリングを外す日です。' },
    removeOverdue1: { title: '⚠️ Orring — 取り外しが遅れています', body: '予定では昨日リングを外す日でした。外して、アプリに記録してね。' },
    removeOverdue3: { title: '⚠️ Orring — 取り外しが遅れています', body: '予定の取り外しから3日過ぎています。リングを外したら記録して、トラッキングを再同期してね。' },
    insertJ7: { title: '⭕ Orring — 7日後', body: '7日後にリングを入れ直すのを忘れずに。' },
    insertJ1: { title: '⭕ Orring — 明日！', body: '明日はリングを入れ直す日です。' },
    insertJ0: { title: '⭕ Orring — 今日です！', body: '今日はリングを入れ直す日です！' },
    insertOverdue1: { title: '⚠️ Orring — 入れ直しが遅れています', body: '予定では昨日リングを入れ直す日でした。入れ直して、アプリに記録してね。' },
    insertOverdue3: { title: '⚠️ Orring — 入れ直しが遅れています', body: '予定の入れ直しから3日過ぎています。リングを入れ直したら記録して、トラッキングを再同期してね。' },
    periodJ2: { title: '🌸 Orring — 2日後', body: '平均から、生理は2日後の予定です。準備しておきましょう ✨' },
    periodJ0: { title: '🩸 Orring — 今日', body: '平均から予測した日です。始まったら「マイ生理」で初日を記録してね。' },
    periodLate: { title: '🌙 Orring — 少し遅れ', body: '生理が平均より3日遅れています。よくあることです — 始まったら記録してね。' },
    periodOpen: { title: '🌸 Orring — 生理は終わった？', body: '2日間記録がありません。最終日を記録して、この周期をきちんと終えましょう ✨' },
    tempRemoval: { title: '⏰ Orring — 入れ直す時間です', body: 'リングを外して3時間が経ちました。効果を保つために入れ直してね！' },
  },
};

/**
 * Resolve the notification copy for a language code, falling back to
 * English then French so an unmapped/region-suffixed code never throws.
 */
export function getNotifCopy(lang: string | undefined): NotifCopy {
  if (lang && NOTIF_COPY[lang]) return NOTIF_COPY[lang];
  // Tolerate region suffixes like "en-US" → "en".
  const base = lang?.split('-')[0];
  if (base && NOTIF_COPY[base]) return NOTIF_COPY[base];
  return NOTIF_COPY.en ?? NOTIF_COPY.fr;
}
