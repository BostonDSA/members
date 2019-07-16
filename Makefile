name    := members
runtime := nodejs10.x
stages  := build plan
build   := $(shell git describe --tags --always)
shells  := $(foreach stage,$(stages),shell@$(stage))

.PHONY: all apply clean plan $(stages) $(shells)

all: package-lock.json package.zip

.docker:
	mkdir -p $@

.docker/$(build)@plan: .docker/$(build)@build
.docker/$(build)@%: | .docker
	docker build \
	--build-arg RUNTIME=$(runtime) \
	--build-arg AWS_ACCESS_KEY_ID \
	--build-arg AWS_DEFAULT_REGION \
	--build-arg AWS_SECRET_ACCESS_KEY \
	--build-arg TF_VAR_release=$(build) \
	--iidfile $@ \
	--tag boston-dsa/$(name):$(build)-$* \
	--target $* .

package-lock.json package.zip: .docker/$(build)@build
	docker run --rm -w /var/task/ $(shell cat $<) cat $@ > $@

apply: .docker/$(build)@plan .env
	docker run --rm --env-file .env	$(shell cat $<)

clean:
	-docker image rm -f $(shell awk {print} .docker/*)
	-rm -rf .docker *.zip

plan: all .docker/$(build)@plan

$(stages): %: .docker/$(build)@%

$(shells): shell@%: .docker/$(build)@% .env
	docker run --rm -it $(call digest,@$*) /bin/bash
