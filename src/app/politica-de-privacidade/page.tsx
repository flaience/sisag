import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | SISAG",
  description: "Política de Privacidade do SISAG, plataforma de agendamento da Flaience.",
};

const sections = [
  { title: "1. Quem somos", content: <>O SISAG é uma plataforma de agendamento e operação de serviços desenvolvida pela <strong>Flaience</strong>. Esta política explica como tratamos dados pessoais ao disponibilizar o sistema e suas integrações.</> },
  { title: "2. Dados tratados", content: <>Podemos tratar dados de identificação e contato, como nome, telefone, e-mail e vínculo com uma empresa; dados necessários à autenticação; informações de agendamentos, serviços e atendimentos; mensagens enviadas por canais integrados, inclusive WhatsApp; além de registros técnicos de acesso, segurança e funcionamento.</> },
  { title: "3. Finalidades", content: <>Utilizamos esses dados para autenticar usuários, prestar e administrar o serviço, criar e acompanhar agendamentos, enviar comunicações solicitadas, atender pedidos feitos pelo WhatsApp, manter segurança e prevenção a fraudes, solucionar falhas, cumprir obrigações legais e melhorar a operação do SISAG.</> },
  { title: "4. Bases legais", content: <>O tratamento ocorre conforme a finalidade e pode se apoiar na execução de contrato e de procedimentos preliminares, no cumprimento de obrigação legal ou regulatória, no exercício regular de direitos, no legítimo interesse com avaliação de necessidade e proteção dos titulares, ou no consentimento quando ele for exigido.</> },
  { title: "5. Compartilhamento", content: <>Os dados podem ser compartilhados, no limite necessário, com a empresa que utiliza o SISAG, fornecedores de infraestrutura, autenticação, banco de dados, mensageria e automação, e com provedores de canais integrados, como a Meta e o WhatsApp. Também poderemos compartilhar informações quando necessário para cumprir a lei ou proteger direitos. Não comercializamos dados pessoais.</> },
  { title: "6. WhatsApp", content: <>Quando uma pessoa conversa com uma empresa pelo WhatsApp integrado ao SISAG, tratamos o número de telefone, o conteúdo necessário da conversa, identificadores técnicos da mensagem e informações relacionadas ao atendimento ou agendamento. Esse tratamento permite interpretar a solicitação, consultar informações autorizadas e responder pelo mesmo canal.</> },
  { title: "7. Armazenamento e segurança", content: <>Mantemos os dados pelo período necessário às finalidades descritas, ao cumprimento de obrigações e ao exercício de direitos. Adotamos controles técnicos e organizacionais para reduzir riscos de acesso não autorizado, alteração, perda ou divulgação indevida. Nenhum ambiente digital, entretanto, é completamente livre de riscos.</> },
  { title: "8. Direitos dos titulares", content: <>O titular pode solicitar confirmação e acesso, correção, informação sobre compartilhamentos, anonimização, bloqueio ou eliminação quando aplicável, portabilidade nos termos da regulamentação, revisão de decisões automatizadas quando cabível e informações sobre consentimento e sua revogação. Algumas informações poderão ser mantidas quando houver obrigação legal ou outra base legítima.</> },
  { title: "9. Solicitação de exclusão", content: <>Pedidos de exclusão ou outras solicitações relacionadas a dados pessoais podem ser enviados para <a className="font-semibold text-blue-700 underline" href="mailto:luis@flaience.com">luis@flaience.com</a>. Para proteger o titular, poderemos solicitar informações suficientes para confirmar sua identidade e localizar os dados relacionados.</> },
  { title: "10. Atualizações", content: <>Esta política pode ser atualizada para refletir mudanças legais, operacionais ou tecnológicas. A versão vigente permanecerá disponível nesta página com a data da última atualização.</> },
];

export default function PrivacyPolicyPage() {
  return <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900 sm:px-8">
    <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-10">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">SISAG · Flaience</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Política de Privacidade</h1>
        <p className="mt-4 text-sm text-slate-600">Última atualização: 25 de outubro de 2026.</p>
        <p className="mt-5 leading-7 text-slate-700">A Flaience respeita a privacidade e trata dados pessoais com transparência, segurança e finalidade definida, em conformidade com a legislação aplicável, incluindo a Lei Geral de Proteção de Dados Pessoais (LGPD).</p>
      </header>
      <div className="mt-8 space-y-8">
        {sections.map(section => <section key={section.title}>
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <p className="mt-3 leading-7 text-slate-700">{section.content}</p>
        </section>)}
      </div>
      <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
        Contato sobre privacidade: <a className="font-semibold text-blue-700 underline" href="mailto:luis@flaience.com">luis@flaience.com</a>
      </footer>
    </article>
  </main>;
}
