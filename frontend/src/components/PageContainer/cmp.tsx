export type PageContainerProps = {
	children: React.ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
	return <div className="relative py-6 px-8 flex-1">{children}</div>;
}
