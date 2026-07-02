import React, { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { MailOutlined, LockOutlined, LoginOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAuthStore } from './shared/store/authStore';

/**
 * Página de login (gate de acesso "fake", client-side). Layout de duas colunas:
 * formulário à esquerda e painel/hero à direita. Valida e-mail/senha contra a
 * lista autorizada em `shared/credentials.js` — sem segurança real.
 */
function LoginPage() {
    const login = useAuthStore((s) => s.login);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const onFinish = ({ email, password }) => {
        setLoading(true);
        setError(null);
        const ok = login(email, password);
        if (!ok) {
            setError('E-mail ou senha inválidos.');
            setLoading(false);
        }
        // Se ok, o App re-renderiza para a aplicação (authEmail definido no store).
    };

    return (
        <div className="min-h-screen flex" style={{ background: '#f4f3fb' }}>
            {/* Coluna esquerda — formulário */}
            <div className="flex flex-col w-full lg:w-[46%] xl:w-[42%] px-8 sm:px-14 lg:px-16 py-8">
                {/* Topo: logo + idioma */}
                <div className="flex items-center justify-between">
                    <img src="/climoo-logo.png" alt="Climoo" className="h-8 w-auto" />
                    <button
                        type="button"
                        aria-label="Idioma"
                        className="text-gray-400 hover:text-[#210856] text-xl bg-transparent border-0 cursor-pointer"
                    >
                        <GlobalOutlined />
                    </button>
                </div>

                {/* Centro: formulário */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="w-full max-w-[420px] mx-auto">
                        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#9354e0] mb-2">
                            Plano de Descarbonização
                        </span>
                        <h1 className="climoo-heading text-3xl font-bold text-[#210856] mb-1">Bem-vindo de volta</h1>
                        <p className="text-gray-500 mb-8">Acesse sua conta</p>

                        {error && <Alert className="mb-4" type="error" showIcon message={error} />}

                        <Form layout="vertical" onFinish={onFinish} requiredMark={false} disabled={loading}>
                            <Form.Item
                                name="email"
                                label="E-mail"
                                rules={[
                                    { required: true, message: 'Informe o e-mail.' },
                                    { type: 'email', message: 'E-mail inválido.' },
                                ]}
                            >
                                <Input
                                    size="large"
                                    prefix={<MailOutlined className="text-gray-400" />}
                                    placeholder="support@climoo.com.br"
                                    autoComplete="username"
                                />
                            </Form.Item>

                            <Form.Item
                                name="password"
                                label="Senha"
                                className="mb-1"
                                rules={[{ required: true, message: 'Informe a senha.' }]}
                            >
                                <Input.Password
                                    size="large"
                                    prefix={<LockOutlined className="text-gray-400" />}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                            </Form.Item>

                            <div className="text-right mb-4">
                                <button
                                    type="button"
                                    className="text-sm font-medium text-[#210856] hover:text-[#9354e0] bg-transparent border-0 cursor-pointer p-0"
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>

                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<LoginOutlined />}
                                loading={loading}
                                block
                                size="large"
                                className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b]"
                                style={{ height: 50 }}
                            >
                                Entrar
                            </Button>
                        </Form>
                    </div>
                </div>

                {/* Rodapé */}
                <div className="text-center text-xs text-gray-400">
                    <div className="flex items-center justify-center gap-6 mb-1.5">
                        <button type="button" className="hover:text-[#210856] bg-transparent border-0 cursor-pointer text-xs">
                            Política de privacidade
                        </button>
                        <button type="button" className="hover:text-[#210856] bg-transparent border-0 cursor-pointer text-xs">
                            Termos de uso
                        </button>
                    </div>
                    <div>© 2026 Climoo. Todos os direitos reservados.</div>
                </div>
            </div>

            {/* Coluna direita — hero (card com imagem) */}
            <div className="hidden lg:block flex-1 p-3">
                <div
                    className="h-full w-full rounded-[28px] relative overflow-hidden flex items-center justify-center"
                    style={{
                        backgroundColor: '#241a3a',
                        backgroundImage:
                            "linear-gradient(180deg, rgba(20,10,40,0.35) 0%, rgba(20,10,40,0.55) 100%), url('/login-hero.png')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="relative z-10 text-center px-10 xl:px-16 max-w-[680px]">
                        <h2 className="climoo-heading text-white font-bold leading-[1.08] mb-6" style={{ fontSize: 'clamp(2rem, 3.4vw, 3.4rem)' }}>
                            Crie e gerencie seus indicadores de sustentabilidade
                        </h2>
                        <p className="text-white/85 leading-relaxed" style={{ fontSize: 'clamp(1rem, 1.2vw, 1.2rem)' }}>
                            Soluções integradas para inventários de emissões, metas SBTi e planos de descarbonização em
                            conformidade com as normas internacionais
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
