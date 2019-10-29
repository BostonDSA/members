runtime   := nodejs10.x
stages    := build dev plan
terraform := latest
build     := $(shell git describe --tags --always)
shells    := $(foreach stage,$(stages),shell@$(stage))

.PHONY: all apply clean up $(stages) $(shells)

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
	--build-arg TERRAFORM=$(terraform) \
	--build-arg TF_VAR_release=$(build) \
	--iidfile $@ \
	--tag boston-dsa/members:$(build)-$* \
	--target $* .

package-lock.json package.zip: .docker/$(build)@build
	docker run --rm -w /var/task/ $(shell cat $<) cat $@ > $@

apply: .docker/$(build)@plan
	docker run --rm \
	--env AWS_ACCESS_KEY_ID \
	--env AWS_DEFAULT_REGION \
	--env AWS_SECRET_ACCESS_KEY \
	$(shell cat $<)

clean:
	-docker image rm -f $(shell awk {print} .docker/*)
	-rm -rf .docker *.zip

up: .docker/$(build)@build .env
	docker run --rm \
	--env-file .env \
	--publish 3000:3000 \
	$(shell cat $<) \
	npm start

$(stages): %: .docker/$(build)@%

$(shells): shell@%: .docker/$(build)@% .env
	docker run --rm -it \
	--entrypoint /bin/sh \
	--env-file .env \
	$(shell cat $<)
