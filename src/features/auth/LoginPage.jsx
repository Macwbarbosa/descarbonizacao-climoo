import React, { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { MailOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuthStore } from './shared/store/authStore';

/**
 * Página de login (gate de acesso "fake", client-side). Valida e-mail/senha
 * contra a lista autorizada em `shared/credentials.js`. Sem segurança real —
 * apenas restringe o acesso casual à demonstração.
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
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--climoo-grad-decarb)' }}
        >
            <div
                className="w-full max-w-[420px] bg-white p-8 sm:p-10"
                style={{ borderRadius: 24, boxShadow: 'var(--climoo-shadow-card)' }}
            >
                <div className="flex flex-col items-center text-center mb-7">
                    <img src="/climoo-logo.png" alt="Climoo" className="h-8 w-auto" />
                    <span className="text-xs text-gray-500 mt-2">Plano de Descarbonização</span>
                </div>

                <h1 className="climoo-wordmark text-lg font-semibold text-[#210856] mb-1">
                    Entrar
                </h1>
                <p className="text-sm text-gray-500 mb-5">
                    Acesse com o e-mail e a senha fornecidos.
                </p>

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
                            placeholder="nome@empresa.com.br"
                            autoComplete="username"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Senha"
                        rules={[{ required: true, message: 'Informe a senha.' }]}
                    >
                        <Input.Password
                            size="large"
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        icon={<LoginOutlined />}
                        loading={loading}
                        block
                        size="large"
                        className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] mt-1"
                    >
                        Entrar
                    </Button>
                </Form>

                <p className="text-[11px] text-gray-400 text-center mt-6">
                    Climoo · Ferramenta de Descarbonização
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
