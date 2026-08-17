import {FolderGit2, Bot, FileText, GitMerge} from "lucide-react";
import StepCard from "./StepCard";

export default function HowItWorks(){
    const steps = [
    {
        icon: FolderGit2,
        title: "Connect Repository",
        description: "Import your GitHub repository securely."
    },
    {
        icon: Bot,
        title: "AI Reviews PR",
        description: "Analyze pull requests using AI."
    },
    {
        icon: FileText,
        title: "Detailed Report",
        description: "Receive suggestions and issue reports."
    },
    {
        icon: GitMerge,
        title: "Merge with Confidence",
        description: "Ship clean, optimized code."
    }
];
    return (
        <section id ="how-it-works" className ="max-w-7xl mx-auto px-8 py-20">
            <h2 className ="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">How It Works</h2>
            <p className ="text-gray-600 dark:text-gray-400 text-center mb-12">
               Review your pull requests in four simple steps.
            </p>
            <div className ="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {steps.map((step) =>(
                    <StepCard
                        key ={step.title}
                        icon ={step.icon} 
                        title ={step.title} 
                        description ={step.description}
                    />
                ))}
            </div>
            
        </section>
    );

}