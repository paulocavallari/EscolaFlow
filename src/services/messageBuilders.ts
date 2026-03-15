export function buildGuardianNotificationMessage(
    studentName: string,
    className: string,
    authorName: string,
    occurrenceDescription: string,
    finalOpinion: string
) {
    return (
        `*Comunicado Escolar — Ocorrências VC*\n\n` +
        `Prezado(a) responsável pelo(a) aluno(a) *${studentName}* da turma *${className}*,\n\n` +
        `Informamos que foi registrada uma ocorrência referente ao(à) aluno(a), conforme detalhado abaixo.\n\n` +
        `📝 *Ocorrência registrada por ${authorName}:*\n` +
        `${occurrenceDescription}\n\n` +
        `✅ *Parecer final:*\n` +
        `${finalOpinion}\n\n` +
        `Qualquer dúvida, entre em contato com a escola.`
    );
}

export function buildTutorCreationNotificationMessage(
    studentName: string,
    className: string,
    description: string
) {
    return (
        `*Nova Ocorrência Escolar*\n\n` +
        `Aluno: ${studentName}\n` +
        `Turma: ${className}\n\n` +
        `Resumo: ${description}\n\n` +
        `Acesse o app Ocorrências VC para mais detalhes e para registrar a tratativa.`
    );
}

export function buildVPEscalationNotificationMessage(
    studentName: string,
    className: string,
    registeredByName: string,
    tutorObservation: string
) {
    return (
        `*Ocorrência Encaminhada à Vice-Direção*\n\n` +
        `Aluno: ${studentName}\n` +
        `Turma: ${className}\n` +
        `Registrada por: ${registeredByName}\n\n` +
        `Observação do tutor: ${tutorObservation}\n\n` +
        `Acesse o app Ocorrências VC para analisar e registrar a devolutiva.`
    );
}