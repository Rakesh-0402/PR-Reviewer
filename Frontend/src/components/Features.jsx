import {Bot, Zap, ShieldCheck, Code2} from "lucide-react";
import FeatureCard from "./FeatureCard";

export default function Features(){
const features = [
    {
        icon: Bot,
        title: "AI Code Review",
        description:"Get instant AI-powered fenpm run edback on your pull requests."
    },
    {
        icon: Zap,
        title: "Performance Analysis",
        description:"Identify bottlenecks and optimize your code."
    },
    {
        icon : ShieldCheck,
        title:"Security Checks",
        description:"Detect vulnerabilities before merging."
        
    },
    {
        icon: Code2,
        title: "Code Quality",
        description: "Improve readability and maintainability."
    }
];
    return (
        <section id= "features" className ="max-w-7xl mx-auto px-8 py-20">
            
            <h2 className ="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">why choose PR Reviewer?</h2>

            <p className ="text-gray-600 dark:text-gray-400 text-center mb-12">
                Everything you need to review code faster and better
            </p>
            <div className ="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature) =>(
                    <FeatureCard 
                        key ={feature.title}
                        icon ={feature.icon} 
                        title ={feature.title} 
                        description ={feature.description}
                    />
                ))}
            </div>
            
        </section>
    );
}