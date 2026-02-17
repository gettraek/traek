<script lang="ts">
	import TourStep from './TourStep.svelte';

	let { onComplete }: { onComplete: () => void } = $props();

	let currentStep = $state(0);

	const steps = [
		{
			title: 'Willkommen zu Træk',
			description:
				'Træk ist eine räumliche Konversations-Oberfläche. Bewege dich frei auf dem Canvas und erkunde verzweigte Gespräche.',
			targetSelector: '.viewport',
			position: 'center'
		},
		{
			title: 'Nachricht senden',
			description:
				'Gib hier deine Nachricht ein und drücke Enter zum Senden. Deine Konversation wird als Baum auf dem Canvas dargestellt.',
			targetSelector: '.floating-input-container, .input-form',
			position: 'top'
		},
		{
			title: 'Verzweigung erstellen',
			description:
				'Klicke auf eine Nachricht und sende eine neue Antwort. Du kannst mehrere alternative Antworten vom selben Punkt aus erstellen.',
			targetSelector: '.viewport',
			position: 'center'
		},
		{
			title: 'Tastatur-Navigation',
			description:
				'Nutze Pfeiltasten (↑↓←→) zum Navigieren, Home für die Wurzel, "i" für Input-Fokus und "?" für alle Shortcuts.',
			targetSelector: '.viewport',
			position: 'center'
		},
		{
			title: 'Konversation durchsuchen',
			description:
				'Drücke Ctrl+F (oder Cmd+F) um alle Nachrichten zu durchsuchen. Navigiere mit Enter zwischen den Treffern.',
			targetSelector: '.viewport',
			position: 'center'
		},
		{
			title: 'Branches vergleichen',
			description:
				'Nutze das Compare-Icon in der Node-Toolbar um verschiedene Antwort-Pfade nebeneinander zu vergleichen.',
			targetSelector: '.viewport',
			position: 'center'
		},
		{
			title: 'Du bist startklar!',
			description:
				'Du kannst die Tour jederzeit über die Einstellungen neu starten. Viel Spaß beim Erkunden!',
			targetSelector: '.viewport',
			position: 'center'
		}
	] as const;

	function nextStep() {
		if (currentStep < steps.length - 1) {
			currentStep++;
		} else {
			complete();
		}
	}

	function previousStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function complete() {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('traek-desktop-tour-completed', 'true');
		}
		onComplete();
	}
</script>

<TourStep
	title={steps[currentStep].title}
	description={steps[currentStep].description}
	{currentStep}
	totalSteps={steps.length}
	targetSelector={steps[currentStep].targetSelector}
	position={steps[currentStep].position}
	onNext={nextStep}
	onPrevious={previousStep}
	onSkip={complete}
/>
