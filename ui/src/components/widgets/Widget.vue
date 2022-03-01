<template>
	<div
		class="
			bg-white
			dark:bg-neutral-600
			rounded-xl
			space-y-1
			p-5
			text-slate-800
			dark:text-slate-100
		"
	@mouseenter="toggleOptions"
	@mouseleave="toggleOptions"
	>
		<div class="header flex justify-between pb-2">
			<h3> {{ title }} </h3>
			<span class="options space-x-3" v-if="showOptions">
				<font-awesome-icon icon="gear" v-if="hasSettings" class="cursor-pointer text-sky-800 dark:text-sky-300" />
				<font-awesome-icon icon="rotate" v-if="canReload" class="cursor-pointer text-sky-800 dark:text-sky-300" @click="refresh()" />
			</span>
		</div>
		<p>{{loading}}</p>
		<div class="bg-amber-500" v-if="loading"><p>Aaaaa</p></div>
		<div @loading="isLoading" class="relative">
			<slot />
		</div>
	</div>
</template>

<script>

export default {
	props: {
		title: String,
		hasSettings: Boolean,
		canReload: Boolean
	},

	methods: {
		toggleOptions() {
			if (this.showOptions == false) {
				this.showOptions = true
			} else {
				this.showOptions = false
			}
		},

		refresh() {
			this.$emit("refresh")
		},

		isLoading(loading) {
			alert(loading)
			this.loading = loading
		}
	},

	data: function() {
		return {
			showOptions: false,
			loading: false
		};
	}
};
</script>

<style scoped></style>
