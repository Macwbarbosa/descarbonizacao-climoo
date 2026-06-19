import React from 'react';
import { Card, Typography, Form, InputNumber, Select, Row, Col, DatePicker } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

function BaselineEmissionsStep() {

    return (
        <Card className="mt-6">
            <div className="mb-6">
                <Title level={4} className="text-[#210856] mb-2">
                    Emissões do Ano-Base
                </Title>
                <Text type="secondary">
                    Defina as emissões do ano-base que servirão como referência para o cálculo das metas de redução
                </Text>
            </div>

            <Form layout="vertical">
                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item
                            label="Ano-Base"
                            name="baselineYear"
                            rules={[{ required: true, message: 'Campo obrigatório' }]}
                        >
                            <DatePicker
                                picker="year"
                                style={{ width: '100%' }}
                                placeholder="Selecione o ano-base"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="Status da Verificação"
                            name="verificationStatus"
                        >
                            <Select placeholder="Status da verificação">
                                <Option value="verified">Verificado por terceira parte</Option>
                                <Option value="internal">Verificação interna</Option>
                                <Option value="pending">Verificação pendente</Option>
                                <Option value="not_verified">Não verificado</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Title level={5} className="mt-6 mb-4">Emissões por Escopo</Title>

                <Row gutter={24}>
                    <Col span={8}>
                        <Form.Item
                            label="Escopo 1 (tCO2e)"
                            name="scope1Emissions"
                            rules={[{ required: true, message: 'Campo obrigatório' }]}
                        >
                            <InputNumber
                                min={0}
                                step={0.01}
                                style={{ width: '100%' }}
                                placeholder="Ex: 1250.50"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            label="Escopo 2 (tCO2e)"
                            name="scope2Emissions"
                            rules={[{ required: true, message: 'Campo obrigatório' }]}
                        >
                            <InputNumber
                                min={0}
                                step={0.01}
                                style={{ width: '100%' }}
                                placeholder="Ex: 890.25"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            label="Escopo 3 (tCO2e)"
                            name="scope3Emissions"
                        >
                            <InputNumber
                                min={0}
                                step={0.01}
                                style={{ width: '100%' }}
                                placeholder="Ex: 3420.80"
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item
                            label="Método de Cálculo Escopo 2"
                            name="scope2Method"
                            rules={[{ required: true, message: 'Campo obrigatório' }]}
                        >
                            <Select placeholder="Selecione o método">
                                <Option value="location">Baseado em Localização</Option>
                                <Option value="market">Baseado em Mercado</Option>
                                <Option value="both">Ambos os Métodos</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label="Unidade de Normalização"
                            name="normalizationUnit"
                        >
                            <Select placeholder="Unidade para normalização">
                                <Option value="revenue">Por Receita (R$ milhões)</Option>
                                <Option value="production">Por Unidade Produzida</Option>
                                <Option value="employee">Por Funcionário</Option>
                                <Option value="area">Por Área (m²)</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    label="Valor da Unidade de Normalização"
                    name="normalizationValue"
                >
                    <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: '100%' }}
                        placeholder="Ex: 150 (para R$ 150 milhões de receita)"
                    />
                </Form.Item>
            </Form>
        </Card>
    );
}

export default BaselineEmissionsStep;
