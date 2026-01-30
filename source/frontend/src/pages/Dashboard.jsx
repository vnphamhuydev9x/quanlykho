import React from 'react';
import { Card, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

const Dashboard = () => {
    const { t } = useTranslation();
    return (
        <div>
            <Card>
                <Title level={2}>{t('menu.dashboard')}</Title>
                <Paragraph>
                    {t('dashboard.welcome')}
                </Paragraph>
            </Card>
        </div>
    );
};

export default Dashboard;
